/* ═══════════════════════════════════════════
   Kia — fonction serverless Vercel
   Branche l'assistante sur l'API Claude (Anthropic).

   GET  /api/chat → { ai: true|false } (la clé API est-elle configurée ?)
   POST /api/chat → { message, suggestions, recommendations }

   Nécessite la variable d'environnement ANTHROPIC_API_KEY sur Vercel.
   Sans clé, le frontend bascule automatiquement en mode guidé.
   ═══════════════════════════════════════════ */

const Anthropic = require("@anthropic-ai/sdk");
const { LISTINGS, LABELS } = require("../js/data.js");

const MODEL = "claude-opus-4-8";
const MAX_TURNS = 30;
const MAX_MESSAGE_LENGTH = 2000;

const CATALOG = LISTINGS.map((l) => ({
  id: l.id,
  nom: l.name,
  lieu: l.location,
  prix_par_nuit: l.price,
  note: l.rating,
  ambiances: l.ambiances,
  region: LABELS.regions[l.region],
  extras: l.extras.map((e) => LABELS.extras[e]),
  occasions: l.occasions,
  description: l.pitch,
}));

const SYSTEM_PROMPT = `Tu es Kia, la concierge personnelle de Love Explorer — la plateforme de réservation de logements exclusivement romantiques ("le Airbnb des amoureux").

# Ta posture : une vraie concierge d'hôtel 5 étoiles
- Tu prends ton temps. Tu écoutes, tu reformules ce que tu as compris ("Si je comprends bien, vous cherchez…"), et seulement ensuite tu poses ta question suivante.
- Tu creuses les détails qui font la différence : pour qui est ce séjour, quelle période est envisagée, qu'aime l'autre personne, qu'est-ce qui ferait de ce moment une réussite inoubliable.
- Tu ne proposes JAMAIS de logement avant d'avoir compris au minimum : l'occasion, l'ambiance recherchée, le budget par nuit, et une idée de la région. Pas de précipitation — la justesse avant la vitesse.
- Une seule question à la fois, jamais de questionnaire.

# Ce que tu cherches à comprendre (au fil d'une conversation naturelle)
1. L'occasion (demande en mariage, lune de miel, anniversaire, Saint-Valentin, surprise, simple envie…)
2. L'ambiance recherchée (nature/insolite, luxe, cosy, mer, montagne, ville)
3. Le budget par nuit
4. La région souhaitée et la période envisagée
5. Les envies particulières (jacuzzi, dîner gastronomique, champagne, massage, nuit sous les étoiles…)

# Ton style
- Français chaleureux, élégant et attentionné. Tutoiement interdit : tu vouvoies toujours.
- Messages courts (2-3 phrases max), un émoji bien choisi au plus, parfois aucun.
- Si ton message contient deux idées (une réaction + une question), sépare-les par un saut de ligne : elles s'afficheront comme deux bulles distinctes, façon messagerie.
- Tu célèbres l'occasion du client avec sincérité, sans en faire trop.

# Les recommandations : LA meilleure option, ou deux
- Quand la qualification est complète, propose LA meilleure option du catalogue — ou deux au grand maximum si l'hésitation est légitime. JAMAIS trois. Une concierge a déjà fait le tri.
- Explique pourquoi c'est LE bon choix pour EUX, en reprenant un détail personnel de la conversation ("Puisque votre compagne adore les étoiles…").
- Ne recommande JAMAIS un logement hors budget annoncé (tolérance +15 %).
- Si rien ne colle parfaitement, propose le plus proche et dis-le honnêtement.

# Les coordonnées du client (lead)
- Dès que le client montre un intérêt réel (il veut les disponibilités, en savoir plus, réserver, ou réagit avec enthousiasme à une proposition), propose qu'un conseiller Love Explorer le recontacte personnellement pour finaliser.
- Demande alors son prénom, puis (message suivant) un email ou un téléphone — naturellement, une information à la fois, jamais les deux d'un coup.
- Précise en une demi-phrase que ses coordonnées ne serviront qu'à être recontacté par Love Explorer, rien d'autre.
- Remplis le champ "lead" (name + contact) dès que tu as les DEUX informations ; laisse les champs vides ("") tant que ce n'est pas le cas.
- Une fois le lead transmis, remercie chaleureusement et confirme qu'un conseiller reviendra vers lui très vite. Ne redemande jamais des coordonnées déjà données.

# Le catalogue Love Explorer
${JSON.stringify(CATALOG, null, 2)}

# Format de réponse
Tu réponds en JSON : "message" (ton message au client), "suggestions" (2 à 4 réponses rapides courtes que le client peut cliquer, vides si question ouverte ou si tu attends prénom/coordonnées), "recommendations" (ids des logements à afficher en cartes — 1 ou 2 maximum, vide tant que tu qualifies encore), "lead" (name et contact du client, chaînes vides tant qu'ils ne sont pas connus).

# Limites
- Tu ne parles que de Love Explorer, de voyages romantiques et du catalogue. Si on t'emmène ailleurs, tu ramènes gentiment la conversation à ta mission.
- Tu n'inventes jamais de logement, de prix ou de disponibilité.
- Tu ne traites aucun paiement : pour réserver, un conseiller humain confirme.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    message: {
      type: "string",
      description: "Le message de Kia au client, en français.",
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
      description: "2 à 4 réponses rapides cliquables, ou tableau vide.",
    },
    recommendations: {
      type: "array",
      items: { type: "string", enum: LISTINGS.map((l) => l.id) },
      description: "Ids des logements du catalogue à afficher en cartes (1 ou 2 maximum).",
    },
    lead: {
      type: "object",
      properties: {
        name: { type: "string", description: "Prénom du client, ou chaîne vide si inconnu." },
        contact: { type: "string", description: "Email ou téléphone du client, ou chaîne vide si inconnu." },
      },
      required: ["name", "contact"],
      additionalProperties: false,
    },
  },
  required: ["message", "suggestions", "recommendations", "lead"],
  additionalProperties: false,
};

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ai: Boolean(process.env.ANTHROPIC_API_KEY) });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "ANTHROPIC_API_KEY non configurée" });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages manquants" });
  }

  const sanitized = messages
    .slice(-MAX_TURNS)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));
  if (sanitized.length === 0 || sanitized[0].role !== "user") {
    return res.status(400).json({ error: "messages invalides" });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      // Pas de "thinking" : sur claude-opus-4-8, l'omettre désactive la
      // réflexion interne → réponses nettement plus rapides, suffisant
      // pour une conversation de qualification.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: RESPONSE_SCHEMA },
      },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: sanitized,
    });

    if (response.stop_reason === "refusal") {
      return res.status(200).json({
        message: "Je préfère qu'on reste sur votre belle escapade en amoureux ! 💕 Dites-moi plutôt : quelle est l'occasion ?",
        suggestions: [],
        recommendations: [],
        lead: { name: "", contact: "" },
      });
    }

    const text = response.content.find((b) => b.type === "text");
    const payload = JSON.parse(text.text);
    payload.recommendations = (payload.recommendations || [])
      .filter((id) => LISTINGS.some((l) => l.id === id))
      .slice(0, 2);
    return res.status(200).json(payload);
  } catch (err) {
    console.error("Erreur API Claude:", err);
    return res.status(502).json({ error: "Erreur du service de conversation" });
  }
};
