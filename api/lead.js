/* ═══════════════════════════════════════════
   Réception des leads qualifiés par Kia.

   POST /api/lead { name, contact, source, profile?, recommendation?, conversation? }

   - Toujours journalisé (visible dans les logs Vercel).
   - Si LEAD_WEBHOOK_URL est configurée (Zapier, Make, Slack, CRM…),
     le lead y est transmis en JSON tel quel.
   ═══════════════════════════════════════════ */

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { name, contact, source, profile, recommendation, conversation } = req.body || {};
  if (!name || !contact) {
    return res.status(400).json({ error: "name et contact sont requis" });
  }

  const lead = {
    name: String(name).slice(0, 100),
    contact: String(contact).slice(0, 200),
    source: source === "ia" ? "ia" : "guide",
    profile: profile && typeof profile === "object" ? profile : undefined,
    recommendation: typeof recommendation === "string" ? recommendation.slice(0, 100) : undefined,
    conversation: Array.isArray(conversation)
      ? conversation.slice(-20).map((m) => ({
          role: m.role === "assistant" ? "kia" : "client",
          content: String(m.content).slice(0, 500),
        }))
      : undefined,
    receivedAt: new Date().toISOString(),
  };

  console.log("[LEAD LOVE EXPLORER]", JSON.stringify(lead));

  if (process.env.LEAD_WEBHOOK_URL) {
    try {
      await fetch(process.env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch (err) {
      // Le lead reste dans les logs même si le webhook échoue
      console.error("Webhook lead injoignable:", err);
    }
  }

  return res.status(200).json({ ok: true });
};
