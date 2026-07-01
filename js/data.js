/* ═══════════════════════════════════════════
   Love Explorer — catalogue de logements (démo)
   Chaque logement porte des tags utilisés par
   Kia pour le matching (ambiance, région, extras).
   ═══════════════════════════════════════════ */

const LISTINGS = [
  {
    id: "cabane-perchee",
    name: "Cabane perchée des Amants",
    location: "Forêt de Brocéliande, Bretagne",
    price: 180,
    rating: 4.9,
    reviews: 214,
    icon: "🌲",
    gradient: "linear-gradient(135deg, #2f4f3a, #1a2e22)",
    badge: "Coup de cœur",
    ambiances: ["nature", "cosy"],
    region: "ouest",
    extras: ["jacuzzi", "petit-dejeuner"],
    occasions: ["anniversaire", "surprise", "envie"],
    tags: ["Cabane dans les arbres", "Jacuzzi privatif", "Petit-déj hissé au panier"],
    pitch: "Une cabane à 8 mètres du sol, un jacuzzi face à la canopée et le petit-déjeuner livré au panier suspendu."
  },
  {
    id: "bulle-etoiles",
    name: "Bulle des Étoiles",
    location: "Provence, près de Gordes",
    price: 145,
    rating: 4.8,
    reviews: 189,
    icon: "🌌",
    gradient: "linear-gradient(135deg, #1c2541, #3a2d5c)",
    badge: "Insolite",
    ambiances: ["nature", "insolite"],
    region: "sud",
    extras: ["etoiles", "champagne"],
    occasions: ["demande", "surprise", "saint-valentin", "envie"],
    tags: ["Dôme transparent", "Ciel étoilé", "Champagne offert"],
    pitch: "Un dôme transparent au milieu des lavandes : on s'endort sous la Voie lactée, une coupe à la main."
  },
  {
    id: "suite-jacuzzi",
    name: "Suite Éden & Spa privatif",
    location: "Cœur de Lyon",
    price: 240,
    rating: 4.9,
    reviews: 342,
    icon: "🛁",
    gradient: "linear-gradient(135deg, #5c2438, #8a3050)",
    badge: "Best-seller",
    ambiances: ["luxe", "ville", "cosy"],
    region: "centre",
    extras: ["jacuzzi", "massage", "champagne"],
    occasions: ["anniversaire", "saint-valentin", "envie"],
    tags: ["Jacuzzi XXL", "Lit rond", "Room service 24h"],
    pitch: "Une suite feutrée avec jacuzzi XXL, lumières tamisées et room service — le cocon urbain par excellence."
  },
  {
    id: "villa-mer",
    name: "Villa Horizon Amoureux",
    location: "Cassis, Côte d'Azur",
    price: 420,
    rating: 5.0,
    reviews: 96,
    icon: "🌊",
    gradient: "linear-gradient(135deg, #145374, #1d7a8c)",
    badge: "Vue mer",
    ambiances: ["mer", "luxe"],
    region: "sud",
    extras: ["piscine", "diner", "massage"],
    occasions: ["demande", "lune-de-miel", "anniversaire"],
    tags: ["Piscine à débordement", "Vue calanques", "Chef privé"],
    pitch: "Piscine à débordement face aux calanques et chef privé au coucher du soleil : la demande en mariage rêvée."
  },
  {
    id: "chalet-neige",
    name: "Chalet Braise & Neige",
    location: "Megève, Alpes",
    price: 310,
    rating: 4.8,
    reviews: 158,
    icon: "🏔️",
    gradient: "linear-gradient(135deg, #3d3d5c, #23233d)",
    badge: "Montagne",
    ambiances: ["montagne", "cosy", "luxe"],
    region: "est",
    extras: ["jacuzzi", "cheminee", "diner"],
    occasions: ["lune-de-miel", "anniversaire", "envie"],
    tags: ["Cheminée", "Bain nordique", "Vue Mont-Blanc"],
    pitch: "Feu de cheminée, plaid en laine et bain nordique fumant sous les flocons, face au Mont-Blanc."
  },
  {
    id: "peniche-paris",
    name: "Péniche Mon Amour",
    location: "Quais de Seine, Paris",
    price: 260,
    rating: 4.7,
    reviews: 273,
    icon: "⛵",
    gradient: "linear-gradient(135deg, #4a3267, #2b1d42)",
    badge: "Iconique",
    ambiances: ["ville", "insolite", "cosy"],
    region: "paris",
    extras: ["diner", "champagne"],
    occasions: ["saint-valentin", "surprise", "demande", "envie"],
    tags: ["Sur la Seine", "Terrasse privée", "Tour Eiffel scintillante"],
    pitch: "Une péniche rien qu'à vous sur la Seine, terrasse privée et Tour Eiffel qui scintille à 23 h."
  },
  {
    id: "chateau-loire",
    name: "Suite du Château des Soupirs",
    location: "Vallée de la Loire",
    price: 350,
    rating: 4.9,
    reviews: 121,
    icon: "🏰",
    gradient: "linear-gradient(135deg, #6b4c2a, #402d18)",
    badge: "Prestige",
    ambiances: ["luxe", "nature"],
    region: "centre",
    extras: ["diner", "champagne", "massage"],
    occasions: ["demande", "lune-de-miel", "anniversaire"],
    tags: ["Château XVIIe", "Baldaquin", "Dîner aux chandelles"],
    pitch: "Lit à baldaquin, parc centenaire et dîner aux chandelles dans l'orangerie d'un vrai château."
  },
  {
    id: "cabane-lac",
    name: "Lodge du Lac Miroir",
    location: "Annecy, Haute-Savoie",
    price: 195,
    rating: 4.8,
    reviews: 167,
    icon: "🛶",
    gradient: "linear-gradient(135deg, #1f5f5b, #123c3a)",
    badge: "Nature",
    ambiances: ["nature", "montagne", "cosy"],
    region: "est",
    extras: ["etoiles", "petit-dejeuner", "cheminee"],
    occasions: ["surprise", "envie", "anniversaire"],
    tags: ["Ponton privé", "Canoë pour deux", "Feu de camp"],
    pitch: "Un lodge les pieds dans l'eau, un canoë pour deux au lever du soleil et un feu de camp le soir."
  }
];

/* Libellés lisibles pour les réponses de Kia */
const LABELS = {
  occasions: {
    "demande": "une demande en mariage 💍",
    "lune-de-miel": "votre lune de miel 🕊️",
    "anniversaire": "un anniversaire de couple 🎂",
    "saint-valentin": "la Saint-Valentin 💘",
    "surprise": "une escapade surprise 🎁",
    "envie": "une envie d'évasion à deux ✨"
  },
  ambiances: {
    "nature": "nature & insolite 🌿",
    "insolite": "nature & insolite 🌿",
    "luxe": "luxe & prestige 👑",
    "cosy": "cosy & intimiste 🕯️",
    "mer": "face à la mer 🌊",
    "montagne": "montagne 🏔️",
    "ville": "cœur de ville 🌃"
  },
  extras: {
    "jacuzzi": "jacuzzi / spa privatif",
    "diner": "dîner gastronomique",
    "champagne": "champagne & pétales",
    "massage": "massage en duo",
    "etoiles": "nuit sous les étoiles",
    "piscine": "piscine privée",
    "cheminee": "feu de cheminée",
    "petit-dejeuner": "petit-déjeuner romantique"
  },
  regions: {
    "paris": "Paris & Île-de-France",
    "ouest": "Ouest & Bretagne",
    "sud": "Sud & Méditerranée",
    "est": "Alpes & Est",
    "centre": "Centre & Vallée de la Loire",
    "partout": "partout en France"
  }
};
