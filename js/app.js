/* ═══════════════════════════════════════════
   Love Explorer — UI : catalogue + widget de chat Kia
   ═══════════════════════════════════════════ */

(() => {
  /* ---------- Catalogue sur la page ---------- */

  const grid = document.getElementById("listings-grid");
  grid.innerHTML = LISTINGS.map((l) => `
    <article class="listing-card" id="listing-${l.id}">
      <div class="listing-visual" style="background:${l.gradient}">
        <span>${l.icon}</span>
        <span class="listing-badge">${l.badge}</span>
      </div>
      <div class="listing-body">
        <h3>${l.name}</h3>
        <p class="listing-loc">📍 ${l.location}</p>
        <div class="listing-tags">${l.tags.map((t) => `<span>${t}</span>`).join("")}</div>
        <div class="listing-foot">
          <p class="listing-price"><strong>${l.price} €</strong> <span>/ nuit</span></p>
          <p class="listing-rating">★ ${l.rating} <span style="color:var(--muted)">(${l.reviews})</span></p>
        </div>
      </div>
    </article>
  `).join("");

  /* ---------- Widget Kia ---------- */

  const panel = document.getElementById("kia-panel");
  const messagesEl = document.getElementById("kia-messages");
  const quickEl = document.getElementById("kia-quick");
  const form = document.getElementById("kia-form");
  const input = document.getElementById("kia-text");

  let started = false;
  let busy = false;

  function openChat() {
    document.body.classList.add("kia-open");
    panel.setAttribute("aria-hidden", "false");
    if (!started) {
      started = true;
      playActions(Kia.greeting());
    }
    input.focus();
  }

  function closeChat() {
    document.body.classList.remove("kia-open");
    panel.setAttribute("aria-hidden", "true");
  }

  document.getElementById("kia-launcher").addEventListener("click", openChat);
  document.getElementById("kia-close").addEventListener("click", closeChat);
  document.getElementById("hero-open-chat").addEventListener("click", openChat);
  document.getElementById("nav-open-chat").addEventListener("click", openChat);
  document.getElementById("about-open-chat").addEventListener("click", openChat);
  document.getElementById("kia-restart").addEventListener("click", () => {
    if (busy) return;
    messagesEl.innerHTML = "";
    quickEl.innerHTML = "";
    Kia.reset();
    playActions(Kia.greeting());
  });

  /* ---------- Rendu des messages ---------- */

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

  function addCard({ listing, score, reasons }) {
    const el = document.createElement("div");
    el.className = "msg-card";
    const why = reasons.slice(0, 3).join(" · ");
    el.innerHTML = `
      <div class="msg-card-visual" style="background:${listing.gradient}">${listing.icon}</div>
      <div class="msg-card-body">
        <h4>${listing.name}</h4>
        <p class="msg-card-loc">📍 ${listing.location} — ★ ${listing.rating}</p>
        ${why ? `<p class="msg-card-why">💡 ${why}</p>` : ""}
        <div class="msg-card-foot">
          <strong>${listing.price} € / nuit</strong>
          <span class="match">${matchLabel(score)}</span>
        </div>
      </div>`;
    el.addEventListener("click", () => {
      closeChat();
      const target = document.getElementById(`listing-${listing.id}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    el.style.cursor = "pointer";
    messagesEl.appendChild(el);
    scrollDown();
  }

  function matchLabel(score) {
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
        respond(opt.value, false);
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

  /* Joue les actions de Kia avec un délai naturel entre chaque bulle */
  function playActions(actions) {
    busy = true;
    quickEl.innerHTML = "";
    let delay = 0;
    actions.forEach((action, i) => {
      const thinkTime = action.type === "text" ? 650 : 450;
      delay += thinkTime;
      const typing = i === 0 || actions[i - 1].type !== "options";
      setTimeout(() => {
        const typingEl = action.type !== "options" ? showTyping() : null;
        setTimeout(() => {
          if (typingEl) typingEl.remove();
          if (action.type === "text") addKiaMessage(action.text);
          else if (action.type === "cards") action.items.forEach(addCard);
          else if (action.type === "options") showQuickReplies(action.options);
          if (i === actions.length - 1) busy = false;
        }, typingEl ? 500 : 0);
      }, delay);
      delay += 500;
    });
  }

  function respond(value, isFreeText) {
    playActions(Kia.handleInput(value, isFreeText));
  }

  /* ---------- Saisie libre ---------- */

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = "";
    addUserMessage(text);
    quickEl.innerHTML = "";
    respond(text, true);
  });

  /* Ouverture automatique après 4 s pour engager le visiteur */
  setTimeout(() => {
    if (!started && !document.body.classList.contains("kia-open")) openChat();
  }, 4000);
})();
