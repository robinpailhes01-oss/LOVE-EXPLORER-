/* ═══════════════════════════════════════════
   Kia — fenêtre de conversation Love Explorer
   Deux moteurs :
   - Mode IA : /api/chat (Vercel + API Claude), conversation libre
   - Mode guidé : moteur scripté Kia (js/kia.js), sans clé API
   Le mode est détecté au chargement via GET /api/chat.
   ═══════════════════════════════════════════ */

(() => {
  const messagesEl = document.getElementById("kia-messages");
  const quickEl = document.getElementById("kia-quick");
  const modeEl = document.getElementById("kia-mode");
  const form = document.getElementById("kia-form");
  const input = document.getElementById("kia-text");

  let aiMode = false;
  let busy = false;
  let history = []; // historique {role, content} pour le mode IA

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
    let delay = 0;
    actions.forEach((action, i) => {
      delay += action.type === "text" ? 650 : 450;
      setTimeout(() => {
        const typingEl = action.type !== "options" ? showTyping() : null;
        setTimeout(() => {
          if (typingEl) typingEl.remove();
          if (action.type === "text") addKiaMessage(action.text);
          else if (action.type === "cards") action.items.forEach((r) => addCard(r.listing, r.reasons, r.score));
          else if (action.type === "options") showQuickReplies(action.options);
          if (i === actions.length - 1) busy = false;
        }, typingEl ? 500 : 0);
      }, delay);
      delay += 500;
    });
  }

  function respondScripted(value, isFreeText) {
    playScriptedActions(Kia.handleInput(value, isFreeText));
  }

  /* ---------- Mode IA (API Claude via Vercel) ---------- */

  async function respondAI(text) {
    busy = true;
    quickEl.innerHTML = "";
    history.push({ role: "user", content: text });
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

      addKiaMessage(data.message);
      history.push({ role: "assistant", content: JSON.stringify(data) });

      (data.recommendations || []).forEach((id) => {
        const listing = LISTINGS.find((l) => l.id === id);
        if (listing) addCard(listing, null, null);
      });
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

  /* ---------- Démarrage ---------- */

  function setMode(ai) {
    modeEl.textContent = ai ? "✦ IA" : "guidé";
  }

  function startConversation() {
    messagesEl.innerHTML = "";
    quickEl.innerHTML = "";
    history = [];
    if (aiMode) {
      busy = true;
      const typingEl = showTyping();
      setTimeout(() => {
        typingEl.remove();
        addKiaMessage("Bonjour et bienvenue chez Love Explorer ! 💕 Je suis Kia, votre assistante personnelle.\nRacontez-moi : quelle escapade en amoureux avez-vous en tête ?");
        showQuickReplies([
          { label: "💍 Une demande en mariage", value: "Je prépare une demande en mariage" },
          { label: "🎂 Un anniversaire", value: "C'est pour notre anniversaire de couple" },
          { label: "✨ Juste envie de nous deux", value: "On a juste envie d'une escapade en amoureux" },
        ]);
        busy = false;
      }, 900);
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

  detectMode();
})();
