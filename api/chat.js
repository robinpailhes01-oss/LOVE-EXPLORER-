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

const SYSTEM_PROMPT = `Tu es Kia, l'assistante personnelle de Love Explorer — la plateforme de réservation de logements exclusivement romantiques ("le Airbnb des amoureux").

# Ta mission
Qualifier chaleureusement les visiteurs pour leur recommander le logement et l'expérience parfaits pour leur couple. Tu dois découvrir, au fil d'une conversation naturelle (pas un interrogatoire) :
1. L'occasion (demande en mariage, lune de miel, anniversaire, Saint-Valentin, surprise, simple envie…)
2. L'ambiance recherchée (nature/insolite, luxe, cosy, mer, montagne, ville)
3. Le budget par nuit
4. La région souhaitée
5. Les envies particulières (jacuzzi, dîner gastronomique, champagne, massage, nuit sous les étoiles…)

# Ton style
- Français chaleureux, complice et pétillant, tutoiement interdit : tu vouvoies toujours.
- Messages courts (2-3 phrases max), un ou deux emojis bien choisis, jamais plus.
- Si ton message contient deux idées (une réaction + une question), sépare-les par un saut de ligne : elles s'afficheront comme deux bulles distinctes, façon messagerie.
- Une seule question à la fois.
- Tu célèbres l'occasion du client ("Une demande en mariage, quelle merveille ! 💍").

# Les recommandations
- Quand tu connais au moins l'occasion, l'ambiance et le budget, propose 1 à 3 logements du catalogue (champ "recommendations" avec leurs id exacts).
- Justifie chaque choix en une phrase dans ton message.
- Ne recommande JAMAIS un logement hors budget annoncé (tolérance +15 %).
- Si rien ne colle parfaitement, propose le plus proche et dis-le honnêtement.
- Après une recommandation, propose de vérifier les disponibilités : un conseiller Love Explorer prendra le relais.

# Le catalogue Love Explorer
${JSON.stringify(CATALOG, null, 2)}

# Format de réponse
Tu réponds en JSON : "message" (ton message au client), "suggestions" (2 à 4 réponses rapides courtes que le client peut cliquer, vides si question ouverte), "recommendations" (ids des logements à afficher en cartes, vide tant que tu qualifies encore).

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
      description: "Ids des logements du catalogue à afficher en cartes.",
    },
  },
  required: ["message", "suggestions", "recommendations"],
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
      });
    }

    const text = response.content.find((b) => b.type === "text");
    const payload = JSON.parse(text.text);
    payload.recommendations = (payload.recommendations || []).filter((id) =>
      LISTINGS.some((l) => l.id === id)
    );
    return res.status(200).json(payload);
  } catch (err) {
    console.error("Erreur API Claude:", err);
    return res.status(502).json({ error: "Erreur du service de conversation" });
  }
};
