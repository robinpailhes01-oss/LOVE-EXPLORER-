/* ═══════════════════════════════════════════
   Kia — assistante conversationnelle Love Explorer
   Flow de qualification :
   occasion → ambiance → budget → région → extras → recommandations
   ═══════════════════════════════════════════ */

const Kia = (() => {

  /* ---------- Étapes du dialogue ---------- */

  const STEPS = {
    occasion: {
      prompt: (p) =>
        "Pour commencer : quelle est l'occasion de cette escapade ? 💞",
      options: [
        { label: "💍 Demande en mariage", value: "demande" },
        { label: "🕊️ Lune de miel", value: "lune-de-miel" },
        { label: "🎂 Anniversaire", value: "anniversaire" },
        { label: "💘 Saint-Valentin", value: "saint-valentin" },
        { label: "🎁 Surprise", value: "surprise" },
        { label: "✨ Juste envie de nous deux", value: "envie" }
      ],
      keywords: {
        "demande": ["demande", "mariage", "fianc", "bague", "genou"],
        "lune-de-miel": ["lune", "miel", "noces", "honeymoon", "marié"],
        "anniversaire": ["anniversaire", "an ensemble", "ans ensemble"],
        "saint-valentin": ["valentin", "14 février"],
        "surprise": ["surprise", "surprendre", "cadeau"],
        "envie": ["envie", "évasion", "week", "détente", "rien"]
      },
      ack: (v) => `${LABELS.occasions[v].charAt(0).toUpperCase() + LABELS.occasions[v].slice(1)} — j'adore, on va marquer le coup ! 🥰`
    },

    ambiance: {
      prompt: () =>
        "Quelle ambiance vous fait rêver tous les deux ?",
      options: [
        { label: "🌿 Nature & insolite", value: "nature" },
        { label: "👑 Luxe & prestige", value: "luxe" },
        { label: "🕯️ Cosy & intimiste", value: "cosy" },
        { label: "🌊 Face à la mer", value: "mer" },
        { label: "🏔️ Montagne", value: "montagne" },
        { label: "🌃 Cœur de ville", value: "ville" }
      ],
      keywords: {
        "nature": ["nature", "forêt", "insolite", "cabane", "bulle", "arbre", "vert"],
        "luxe": ["luxe", "prestige", "château", "5 étoiles", "haut de gamme", "chic"],
        "cosy": ["cosy", "intim", "cocon", "cheminée", "douillet", "calme"],
        "mer": ["mer", "plage", "océan", "côte", "calanque", "vague"],
        "montagne": ["montagne", "alpes", "neige", "chalet", "ski", "sommet"],
        "ville": ["ville", "paris", "lyon", "urbain", "citadin", "restaurant"]
      },
      ack: (v) => `Ambiance ${LABELS.ambiances[v]} : très bon goût. 😌`
    },

    budget: {
      prompt: () =>
        "Parlons budget : combien souhaitez-vous mettre par nuit ?",
      options: [
        { label: "💐 Moins de 180 €", value: "eco" },
        { label: "🌹 180 – 280 €", value: "confort" },
        { label: "💎 280 – 400 €", value: "premium" },
        { label: "👑 Plus de 400 €", value: "prestige" }
      ],
      keywords: {
        "eco": ["moins", "petit", "150", "100", "120", "serré", "économique"],
        "confort": ["180", "200", "250", "moyen", "raisonnable"],
        "premium": ["300", "350", "premium", "confortable"],
        "prestige": ["400", "500", "illimité", "peu importe", "pas de limite", "large"]
      },
      ack: () => "C'est noté, je reste dans cette enveloppe. 📝"
    },

    region: {
      prompt: () =>
        "Une région de cœur pour cette escapade ?",
      options: [
        { label: "🗼 Paris & Île-de-France", value: "paris" },
        { label: "⚓ Ouest & Bretagne", value: "ouest" },
        { label: "☀️ Sud & Méditerranée", value: "sud" },
        { label: "🏔️ Alpes & Est", value: "est" },
        { label: "🏰 Centre & Loire", value: "centre" },
        { label: "🧭 Peu importe, surprenez-nous", value: "partout" }
      ],
      keywords: {
        "paris": ["paris", "île-de-france", "idf"],
        "ouest": ["bretagne", "ouest", "normandie", "atlantique", "nantes"],
        "sud": ["sud", "provence", "méditerranée", "côte d'azur", "marseille", "nice"],
        "est": ["alpes", "est", "savoie", "annecy", "montagne", "alsace"],
        "centre": ["centre", "loire", "lyon", "auvergne"],
        "partout": ["importe", "surpren", "partout", "sais pas", "aucune"]
      },
      ack: (v) => v === "partout"
        ? "J'aime cet esprit d'aventure ! Je cherche dans toute la France. 🧭"
        : `Direction ${LABELS.regions[v]} ! 🧳`
    },

    extras: {
      prompt: () =>
        "Dernière question : qu'est-ce qui rendrait ce séjour inoubliable ? (vous pouvez en choisir plusieurs, puis « C'est tout ! »)",
      multi: true,
      options: [
        { label: "🛁 Jacuzzi / spa privatif", value: "jacuzzi" },
        { label: "🍽️ Dîner gastronomique", value: "diner" },
        { label: "🥂 Champagne & pétales", value: "champagne" },
        { label: "💆 Massage en duo", value: "massage" },
        { label: "🌌 Nuit sous les étoiles", value: "etoiles" },
        { label: "✅ C'est tout !", value: "__done__" }
      ],
      keywords: {
        "jacuzzi": ["jacuzzi", "spa", "bain", "balnéo"],
        "diner": ["dîner", "diner", "gastro", "chef", "restaurant", "chandelles"],
        "champagne": ["champagne", "pétale", "rose", "bulles"],
        "massage": ["massage", "duo", "détente", "soin"],
        "etoiles": ["étoile", "ciel", "nuit", "dôme", "bulle"]
      },
      ack: null // géré à la main dans le flow multi
    }
  };

  const STEP_ORDER = ["occasion", "ambiance", "budget", "region", "extras"];

  const BUDGET_RANGES = {
    eco: [0, 180],
    confort: [180, 280],
    premium: [280, 400],
    prestige: [400, Infinity]
  };

  /* ---------- État ---------- */

  let state;

  function reset() {
    state = {
      stepIndex: -1, // -1 = accueil pas encore envoyé
      profile: { occasion: null, ambiance: null, budget: null, region: null, extras: [] },
      done: false,
      leadStep: null, // null | "name" | "contact" | "done"
      lead: { name: null, contact: null },
      topListingId: null
    };
  }
  reset();

  /* ---------- Matching ---------- */

  function scoreListing(listing, p) {
    let score = 0;
    const reasons = [];

    if (p.ambiance && listing.ambiances.includes(p.ambiance)) {
      score += 3;
      reasons.push(`ambiance ${LABELS.ambiances[p.ambiance]}`);
    }
    if (p.occasion && listing.occasions.includes(p.occasion)) {
      score += 2;
      reasons.push(`parfait pour ${LABELS.occasions[p.occasion]}`);
    }
    if (p.region && (p.region === "partout" || listing.region === p.region)) {
      score += 2;
      if (p.region !== "partout") reasons.push(`en plein dans votre région`);
    }
    if (p.budget) {
      const [min, max] = BUDGET_RANGES[p.budget];
      if (listing.price >= min && listing.price <= max) {
        score += 2;
        reasons.push("pile dans votre budget");
      } else if (listing.price < min) {
        score += 1; // moins cher que prévu : jamais un problème
        reasons.push("encore plus doux que votre budget");
      } else if (listing.price <= max * 1.15) {
        score += 0.5; // léger dépassement toléré
      } else {
        score -= 2;
      }
    }
    const matchedExtras = p.extras.filter((e) => listing.extras.includes(e));
    score += matchedExtras.length * 1.5;
    matchedExtras.forEach((e) => reasons.push(LABELS.extras[e]));

    return { score, reasons };
  }

  function recommend(profile, count = 3) {
    return LISTINGS
      .map((l) => ({ listing: l, ...scoreListing(l, profile) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }

  /* ---------- Interprétation du texte libre ---------- */

  function matchKeywords(step, text) {
    const lower = text.toLowerCase();
    for (const [value, words] of Object.entries(step.keywords || {})) {
      if (words.some((w) => lower.includes(w))) return value;
    }
    return null;
  }

  /* ---------- Moteur de dialogue ----------
     handleInput(value, isFreeText) → liste d'actions pour l'UI :
     { type: "text", text } | { type: "cards", items } | { type: "options", options }
  ------------------------------------------- */

  function greeting() {
    state.stepIndex = 0;
    return [
      { type: "text", text: "Bonjour et bienvenue chez Love Explorer ! 💕 Moi, c'est Kia." },
      { type: "text", text: "Je suis là pour vous trouver la meilleure expérience romantique possible — en 5 petites questions, c'est promis !" },
      { type: "text", text: STEPS.occasion.prompt(state.profile) },
      { type: "options", options: STEPS.occasion.options }
    ];
  }

  function currentStep() {
    return STEPS[STEP_ORDER[state.stepIndex]];
  }

  function advance() {
    state.stepIndex += 1;
    if (state.stepIndex >= STEP_ORDER.length) return finish();
    const step = currentStep();
    return [
      { type: "text", text: step.prompt(state.profile) },
      { type: "options", options: step.options }
    ];
  }

  function finish() {
    state.done = true;
    // Une concierge a déjà fait le tri : 2 propositions au grand maximum
    const results = recommend(state.profile, 2).filter((r) => r.score > 0);
    if (results.length) state.topListingId = results[0].listing.id;
    const p = state.profile;
    const actions = [
      { type: "text", text: "Laissez-moi regarder parmi nos 250 pépites… 🔎" }
    ];
    if (results.length === 0) {
      actions.push({
        type: "text",
        text: "Hmm, je n'ai pas de correspondance parfaite avec tous ces critères… mais voici mes 3 chouchous du moment, ils font toujours mouche ! 😉"
      });
      actions.push({ type: "cards", items: recommend({ occasion: p.occasion, ambiance: null, budget: null, region: "partout", extras: [] }, 2) });
    } else {
      actions.push({
        type: "text",
        text: `Voici mes ${results.length > 1 ? results.length + " recommandations" : "recommandation"} pour ${LABELS.occasions[p.occasion] || "votre séjour"} :`
      });
      actions.push({ type: "cards", items: results });
    }
    actions.push({
      type: "text",
      text: "Un coup de cœur ? Je peux vérifier les disponibilités, ou on recommence avec d'autres envies. 💌"
    });
    actions.push({
      type: "options",
      options: [
        { label: "📅 Vérifier les disponibilités", value: "__book__" },
        { label: "↺ Recommencer", value: "__restart__" }
      ]
    });
    return actions;
  }

  /* ---------- Collecte des coordonnées (lead) ---------- */

  const EMAIL_RE = /\S+@\S+\.\S{2,}/;
  const PHONE_RE = /(\+?\d[\d\s().-]{7,})/;

  function handleLeadInput(rawValue) {
    const text = String(rawValue).trim();

    if (state.leadStep === "name") {
      if (text.length < 2 || text.length > 60) {
        return [{ type: "text", text: "Pardon, je n'ai pas bien saisi votre prénom — pouvez-vous me le redonner ? 😊" }];
      }
      state.lead.name = text.replace(/^(je m'appelle|moi c'est|c'est)\s+/i, "").trim();
      state.leadStep = "contact";
      return [
        { type: "text", text: `Enchantée, ${state.lead.name} ! 🤍` },
        { type: "text", text: "Sur quel email ou numéro de téléphone notre conseiller peut-il vous joindre ? Vos coordonnées ne serviront qu'à ce rappel, promis." }
      ];
    }

    if (state.leadStep === "contact") {
      const email = text.match(EMAIL_RE);
      const phone = text.match(PHONE_RE);
      if (!email && !phone) {
        return [{ type: "text", text: "Hmm, cela ne ressemble ni à un email ni à un numéro… Pouvez-vous vérifier ? 😊" }];
      }
      state.lead.contact = (email ? email[0] : phone[0]).trim();
      state.leadStep = "done";
      return [
        {
          type: "lead",
          lead: {
            name: state.lead.name,
            contact: state.lead.contact,
            profile: { ...state.profile },
            recommendation: state.topListingId
          }
        },
        { type: "text", text: `Merci ${state.lead.name} ! ✨ C'est noté : un conseiller Love Explorer vous recontacte très vite pour confirmer les disponibilités et peaufiner votre séjour.` },
        { type: "options", options: [{ label: "↺ Nouvelle recherche", value: "__restart__" }] }
      ];
    }

    // leadStep === "done"
    return [
      { type: "text", text: "Votre demande est déjà entre les mains d'un conseiller. 🤍 On repart sur une autre recherche en attendant ?" },
      { type: "options", options: [{ label: "↺ Nouvelle recherche", value: "__restart__" }] }
    ];
  }

  function handleInput(rawValue, isFreeText) {
    // Commandes globales
    if (rawValue === "__restart__") {
      reset();
      return greeting();
    }
    if (rawValue === "__book__") {
      state.leadStep = "name";
      return [
        { type: "text", text: "Avec grand plaisir ! Pour que notre conseiller vous recontacte personnellement, puis-je avoir votre prénom ?" }
      ];
    }
    if (state.leadStep) {
      return handleLeadInput(rawValue);
    }

    if (state.stepIndex < 0) return greeting();
    if (state.done) {
      return [
        { type: "text", text: "Avec plaisir ! On repart sur une nouvelle recherche ? ✨" },
        { type: "options", options: [{ label: "↺ Recommencer", value: "__restart__" }, { label: "📅 Vérifier les disponibilités", value: "__book__" }] }
      ];
    }

    const stepKey = STEP_ORDER[state.stepIndex];
    const step = STEPS[stepKey];

    /* Étape multi-choix (extras) */
    if (step.multi) {
      const saysDone = isFreeText &&
        /(c'est tout|rien d'autre|c est tout|termin|fini|ça ira|ca ira|^non\b|^ok\b)/i.test(rawValue.trim());
      if (rawValue === "__done__" || saysDone) {
        const chosen = state.profile.extras;
        const ack = chosen.length
          ? `Très bien : ${chosen.map((e) => LABELS.extras[e]).join(", ")}. La totale ! 😍`
          : "Simplicité et amour, il n'en faut pas plus. 💛";
        return [{ type: "text", text: ack }, ...advance()];
      }
      let value = isFreeText ? matchKeywords(step, rawValue) : rawValue;
      if (value && LABELS.extras[value]) {
        if (!state.profile.extras.includes(value)) state.profile.extras.push(value);
        const remaining = step.options.filter(
          (o) => o.value === "__done__" || !state.profile.extras.includes(o.value)
        );
        return [
          { type: "text", text: `${LABELS.extras[value].charAt(0).toUpperCase() + LABELS.extras[value].slice(1)}, excellente idée ! Autre chose ?` },
          { type: "options", options: remaining }
        ];
      }
      return [
        { type: "text", text: "Je n'ai pas saisi cette envie — choisissez parmi mes suggestions, ou dites « c'est tout » ! 😊" },
        { type: "options", options: step.options.filter((o) => o.value === "__done__" || !state.profile.extras.includes(o.value)) }
      ];
    }

    /* Étape simple */
    const value = isFreeText ? matchKeywords(step, rawValue) : rawValue;
    if (!value) {
      return [
        { type: "text", text: "Pardon, je n'ai pas bien compris. 🙈 Vous pouvez cliquer sur une option, ce sera plus simple :" },
        { type: "options", options: step.options }
      ];
    }
    state.profile[stepKey] = value;
    const actions = [];
    if (step.ack) actions.push({ type: "text", text: step.ack(value) });
    actions.push(...advance());
    return actions;
  }

  return { greeting, handleInput, reset, recommend };
})();
