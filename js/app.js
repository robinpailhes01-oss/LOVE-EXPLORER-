/* ═══════════════════════════════════════════
   Kia — fenêtre de conversation Love Explorer
   Deux moteurs :
   - Mode IA : /api/chat (Vercel + API Claude), conversation libre
   - Mode guidé : moteur scripté Kia (js/kia.js), sans clé API
   Le mode est détecté au chargement via GET /api/chat.
   ═══════════════════════════════════════════ */

(() => {
  /* Version affichée en pied de fenêtre — incrémentée à chaque évolution.
     Permet de vérifier d'un coup d'œil que le déploiement est à jour. */
  const KIA_VERSION = "1.6";

  const messagesEl = document.getElementById("kia-messages");
  const quickEl = document.getElementById("kia-quick");
  const modeEl = document.getElementById("kia-mode");
  const form = document.getElementById("kia-form");
  const input = document.getElementById("kia-text");

  let aiMode = false;
  let busy = false;
  let history = []; // historique {role, content} pour le mode IA
  let leadSent = false;

  /* Transmet un lead qualifié au backend (logs Vercel + webhook CRM). */
  function sendLead(lead) {
    if (leadSent) return;
    leadSent = true;
    fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    }).catch(() => {});
  }

  /* ---------- Cadence "humaine" des réponses de Kia ----------
     Chaque bulle est précédée d'un temps de frappe proportionnel
     à sa longueur, comme sur une vraie messagerie. */
  const TYPING_MS_PER_CHAR = 22;
  const TYPING_MIN_MS = 450;
  const TYPING_MAX_MS = 1500;
  const PAUSE_BETWEEN_BUBBLES_MS = 320;
  const MAX_BUBBLE_LENGTH = 160;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function typingDuration(text) {
    return Math.min(TYPING_MAX_MS, Math.max(TYPING_MIN_MS, text.length * TYPING_MS_PER_CHAR));
  }

  /* Découpe un message en bulles : d'abord sur les sauts de ligne,
     puis les paragraphes trop longs sont regroupés par phrases. */
  function splitIntoBubbles(text) {
    const bubbles = [];
    for (const para of text.split(/\n+/)) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      if (trimmed.length <= MAX_BUBBLE_LENGTH) {
        bubbles.push(trimmed);
        continue;
      }
      const sentences = trimmed.match(/[^.!?…]+[.!?…]+["»]?\s*|[^.!?…]+$/g) || [trimmed];
      let current = "";
      for (const sentence of sentences) {
        if (current && (current + sentence).length > MAX_BUBBLE_LENGTH) {
          bubbles.push(current.trim());
          current = "";
        }
        current += sentence;
      }
      if (current.trim()) bubbles.push(current.trim());
    }
    return bubbles.length ? bubbles : [text];
  }

  /* Affiche un message de Kia bulle par bulle, avec frappe simulée. */
  async function playKiaText(text) {
    for (const bubble of splitIntoBubbles(text)) {
      const typingEl = showTyping();
      await wait(typingDuration(bubble));
      typingEl.remove();
      addKiaMessage(bubble);
      await wait(PAUSE_BETWEEN_BUBBLES_MS);
    }
  }

  /* ---------- Rendu ---------- */

  function scrollDown() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addUserMessage(text) {
    const el = document.createElement("div");
    el.className = "msg msg-user";
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollDown();
  }

  function addKiaMessage(text) {
    const el = document.createElement("div");
    el.className = "msg msg-kia";
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollDown();
  }

  function addCard(listing, reasons, score) {
    const el = document.createElement("div");
    el.className = "msg-card";
    const why = (reasons || []).slice(0, 3).join(" · ");
    el.innerHTML = `
      <div class="msg-card-visual" style="background:${listing.gradient}">${listing.icon}</div>
      <div class="msg-card-body">
        <h4>${listing.name}</h4>
        <p class="msg-card-loc">📍 ${listing.location} — ★ ${listing.rating}</p>
        <p class="msg-card-pitch">${why ? "💡 " + why : listing.pitch}</p>
        <div class="msg-card-foot">
          <strong>${listing.price} € / nuit</strong>
          <span class="match">${matchLabel(score)}</span>
        </div>
      </div>`;
    messagesEl.appendChild(el);
    scrollDown();
  }

  function matchLabel(score) {
    if (score == null) return "Sélection Kia 💘";
    if (score >= 8) return "Match parfait 💘";
    if (score >= 5) return "Très bon match 💖";
    return "Belle option 💗";
  }

  function showQuickReplies(options) {
    quickEl.innerHTML = "";
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = opt.label;
      btn.addEventListener("click", () => {
        if (busy) return;
        addUserMessage(opt.label.replace(/^[^\p{L}\p{N}]+\s*/u, ""));
        quickEl.innerHTML = "";
        if (aiMode) respondAI(opt.label);
        else respondScripted(opt.value, false);
      });
      quickEl.appendChild(btn);
    });
    scrollDown();
  }

  function showTyping() {
    const el = document.createElement("div");
    el.className = "msg msg-kia msg-typing";
    el.innerHTML = "<i></i><i></i><i></i>";
    messagesEl.appendChild(el);
    scrollDown();
    return el;
  }

  /* ---------- Mode guidé (moteur scripté) ---------- */

  function playScriptedActions(actions) {
    busy = true;
    quickEl.innerHTML = "";
    (async () => {
      for (const action of actions) {
        if (action.type === "text") {
          await playKiaText(action.text);
        } else if (action.type === "cards") {
          for (const r of action.items) {
            addCard(r.listing, r.reasons, r.score);
            await wait(400);
          }
        } else if (action.type === "options") {
          await wait(250);
          showQuickReplies(action.options);
        } else if (action.type === "lead") {
          sendLead({ ...action.lead, source: "guide" });
        }
      }
      busy = false;
    })();
  }

  function respondScripted(value, isFreeText) {
    playScriptedActions(Kia.handleInput(value, isFreeText));
  }

  /* ---------- Mode IA (API Claude via Vercel) ---------- */

  async function respondAI(text) {
    busy = true;
    quickEl.innerHTML = "";
    history.push({ role: "user", content: text });
    // L'indicateur de frappe apparaît après un court instant, comme si
    // Kia lisait le message avant de répondre.
    await wait(350);
    const typingEl = showTyping();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      typingEl.remove();

      await playKiaText(data.message);
      history.push({ role: "assistant", content: JSON.stringify(data) });

      if (data.lead && data.lead.name && data.lead.contact) {
        sendLead({
          name: data.lead.name,
          contact: data.lead.contact,
          source: "ia",
          conversation: history.map((m) =>
            m.role === "assistant"
              ? { role: m.role, content: (JSON.parse(m.content).message || "") }
              : m
          ),
        });
      }

      for (const id of data.recommendations || []) {
        const listing = LISTINGS.find((l) => l.id === id);
        if (listing) {
          addCard(listing, null, null);
          await wait(400);
        }
      }
      if (data.suggestions && data.suggestions.length) {
        showQuickReplies(data.suggestions.map((s) => ({ label: s, value: s })));
      }
    } catch (err) {
      typingEl.remove();
      // L'API ne répond plus : on bascule sur le moteur guidé sans perdre l'utilisateur
      aiMode = false;
      setMode(false);
      addKiaMessage("Petit souci de connexion de mon côté… 🙈 Pas de panique, je continue avec vous en mode guidé !");
      Kia.reset();
      playScriptedActions(Kia.greeting());
      return;
    }
    busy = false;
  }

  /* ---------- Introduction : avatar 3D + voix de bienvenue ---------- */

  const WELCOME_SPEECH =
    "Bienvenue chez Love Explorer ! Moi, c'est Kia. Je suis là pour vous trouver la meilleure expérience romantique possible.";

  function speakWelcome(button) {
    if (!("speechSynthesis" in window)) return;
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      button.classList.remove("speaking");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(WELCOME_SPEECH);
    utterance.lang = "fr-FR";
    utterance.rate = 1;
    utterance.pitch = 1.05;
    const frVoice = speechSynthesis.getVoices().find((v) => v.lang && v.lang.startsWith("fr"));
    if (frVoice) utterance.voice = frVoice;
    utterance.onend = () => button.classList.remove("speaking");
    button.classList.add("speaking");
    speechSynthesis.speak(utterance);
  }

  function addIntro() {
    const intro = document.createElement("div");
    intro.className = "kia-intro";
    intro.innerHTML = `
      <div class="kia-intro-stage"></div>
      <h2>Kia</h2>
      <p class="kia-intro-tagline">Votre conciergerie romantique</p>
      <button type="button" class="kia-voice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </svg>
        Écouter Kia
      </button>`;
    messagesEl.appendChild(intro);

    const stage = intro.querySelector(".kia-intro-stage");
    if (!KiaAvatar.mount(stage)) {
      stage.classList.add("fallback");
      stage.innerHTML = '<span class="fallback-heart">❦</span>';
    }

    const voiceBtn = intro.querySelector(".kia-voice");
    if ("speechSynthesis" in window) {
      voiceBtn.addEventListener("click", () => speakWelcome(voiceBtn));
    } else {
      voiceBtn.style.display = "none";
    }
    scrollDown();
  }

  /* ---------- Démarrage ---------- */

  function setMode(ai) {
    modeEl.textContent = ai ? "✦ IA" : "guidé";
  }

  function startConversation() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    messagesEl.innerHTML = "";
    quickEl.innerHTML = "";
    history = [];
    leadSent = false;
    addIntro();
    if (aiMode) {
      busy = true;
      (async () => {
        await wait(500);
        await playKiaText("Bonjour et bienvenue chez Love Explorer ! 💕 Moi, c'est Kia — je suis là pour vous trouver la meilleure expérience romantique possible.\nRacontez-moi : quelle escapade en amoureux avez-vous en tête ?");
        showQuickReplies([
          { label: "💍 Une demande en mariage", value: "Je prépare une demande en mariage" },
          { label: "🎂 Un anniversaire", value: "C'est pour notre anniversaire de couple" },
          { label: "✨ Juste envie de nous deux", value: "On a juste envie d'une escapade en amoureux" },
        ]);
        busy = false;
      })();
    } else {
      Kia.reset();
      playScriptedActions(Kia.greeting());
    }
  }

  async function detectMode() {
    try {
      const res = await fetch("/api/chat", { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        aiMode = !!data.ai;
      }
    } catch (_) {
      aiMode = false;
    }
    setMode(aiMode);
    startConversation();
  }

  document.getElementById("kia-restart").addEventListener("click", () => {
    if (busy) return;
    startConversation();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = "";
    addUserMessage(text);
    quickEl.innerHTML = "";
    if (aiMode) respondAI(text);
    else respondScripted(text, true);
  });

  const footEl = document.querySelector(".kia-foot");
  if (footEl) footEl.textContent += " · v" + KIA_VERSION;
  console.info("Kia Love Explorer — version " + KIA_VERSION);

  detectMode();
})();
