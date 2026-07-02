# ❦ Kia — Fenêtre de conversation Love Explorer

La fenêtre de chat de **Kia**, l'assistante IA de Love Explorer (« le Airbnb
des amoureux »). Kia discute avec les visiteurs, les qualifie (occasion,
ambiance, budget, région, envies) et les redirige vers le meilleur logement
romantique du catalogue.

Ce dépôt contient **uniquement la fenêtre de conversation**, pensée pour être
déployée sur Vercel et intégrée au site Love Explorer existant (iframe ou
popup).

## ✨ Deux modes de conversation

| Mode | Condition | Comportement |
|---|---|---|
| **✦ IA** | `ANTHROPIC_API_KEY` configurée sur Vercel | Conversation totalement libre avec l'API Claude : Kia qualifie naturellement et recommande les logements du catalogue |
| **Guidé** | Sans clé API (ou si l'API échoue) | Flow scripté en 5 questions avec réponses rapides et scoring de matching — fonctionne sans aucun service externe |

Le mode est détecté automatiquement au chargement (`GET /api/chat`), et le
frontend bascule tout seul en mode guidé si l'API ne répond plus.

## 🚀 Déployer sur Vercel

1. Importer ce dépôt GitHub dans [Vercel](https://vercel.com/new)
   (framework : **Other**, aucune configuration de build nécessaire).
2. Dans *Settings → Environment Variables*, ajouter :
   - `ANTHROPIC_API_KEY` = votre clé API Anthropic ([console.anthropic.com](https://console.anthropic.com))
3. Déployer. C'est tout !

Sans l'étape 2, le chat fonctionne quand même — en mode guidé.

## 🖼️ Intégrer au site Love Explorer

```html
<!-- En iframe plein cadre (460×720 recommandé) -->
<iframe
  src="https://VOTRE-PROJET.vercel.app"
  style="width: 460px; height: 720px; border: none; border-radius: 22px;"
  title="Kia — Assistante Love Explorer">
</iframe>
```

Pour un widget flottant en bas à droite, enveloppez l'iframe dans un
conteneur `position: fixed` affiché au clic d'un bouton.

## 🧪 Tester en local

```bash
# Mode guidé (sans clé) — simple serveur statique
python3 -m http.server 8000

# Mode IA complet — Vercel CLI
npm install
vercel dev   # avec ANTHROPIC_API_KEY dans .env.local
```

## 📁 Structure

```
index.html        La fenêtre de conversation (page unique)
css/styles.css    Thème romantique (bordeaux, rose, or)
js/data.js        Catalogue des logements + libellés (partagé front/back)
js/kia.js         Moteur scripté : qualification, mots-clés, scoring
js/app.js         UI du chat + détection du mode + appels /api/chat
api/chat.js       Fonction serverless Vercel → API Claude (claude-opus-4-8)
```

## 🔧 Personnaliser

- **Ajouter un logement** : une entrée dans `LISTINGS` (`js/data.js`) — les
  deux modes (IA et guidé) la prennent en compte automatiquement.
- **Ajuster la personnalité de Kia** : le `SYSTEM_PROMPT` dans `api/chat.js`.
- **Modifier le flow guidé** : les étapes dans `STEPS` (`js/kia.js`).
