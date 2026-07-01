# ❦ Love Explorer — Kia, l'assistante romantique

Love Explorer, c'est « le Airbnb des amoureux » : une plateforme dédiée
exclusivement aux logements romantiques. Ce dépôt contient le site vitrine
avec **Kia**, l'assistante conversationnelle qui qualifie les visiteurs et
les redirige vers le meilleur logement et la meilleure expérience.

## ✨ Ce que fait Kia

Kia engage la conversation (elle s'ouvre automatiquement après quelques
secondes) et pose 5 questions de qualification :

1. **L'occasion** — demande en mariage, lune de miel, anniversaire, Saint-Valentin, surprise…
2. **L'ambiance** — nature & insolite, luxe, cosy, mer, montagne, ville
3. **Le budget** par nuit
4. **La région** souhaitée
5. **Les envies** — jacuzzi, dîner gastronomique, champagne, massage, nuit sous les étoiles (multi-choix)

Elle calcule ensuite un **score de matching** pour chaque logement du
catalogue et présente les 3 meilleures recommandations sous forme de cartes
cliquables (avec la raison du match et un badge « Match parfait 💘 »).
Un clic sur une carte fait défiler la page jusqu'à la fiche du logement.

Le visiteur peut répondre en cliquant sur les suggestions **ou en texte
libre** : Kia comprend les mots-clés (« on aimerait un jacuzzi », « plutôt
la Bretagne », « c'est pour demander sa main »…).

## 🚀 Lancer le site

Aucune dépendance, aucun build : c'est un site statique.

```bash
# Option 1 : ouvrir directement
open index.html

# Option 2 : petit serveur local
python3 -m http.server 8000
# puis http://localhost:8000
```

## 📁 Structure

```
index.html        Page vitrine + widget de chat Kia
css/styles.css    Thème romantique (bordeaux, rose, or)
js/data.js        Catalogue des logements + libellés (LISTINGS, LABELS)
js/kia.js         Moteur de dialogue : étapes, mots-clés, scoring, recommandations
js/app.js         Rendu du catalogue et de l'interface de chat
```

## 🔧 Personnaliser

- **Ajouter un logement** : ajouter une entrée dans `LISTINGS` (`js/data.js`)
  avec ses `ambiances`, `region`, `extras`, `occasions` — le matching de Kia
  le prend en compte automatiquement.
- **Modifier le dialogue** : les étapes, options et mots-clés sont dans
  `STEPS` (`js/kia.js`).
- **Brancher une vraie IA** : le moteur est isolé derrière
  `Kia.handleInput(texte)` → il suffit de remplacer cette fonction par un
  appel à l'API Claude pour passer d'un flow scripté à une conversation
  totalement libre, sans toucher à l'interface.
