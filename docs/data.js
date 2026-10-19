/* Mon Programme Fitness — données du programme
   Pour modifier un exercice : change le texte entre guillemets, enregistre, recharge la page. */

window.MUSCLES = {
  pecs:        { nom: "Grand pectoral",              parts: [["front", "chest"]] },
  "pecs-haut": { nom: "Haut des pectoraux (faisceau claviculaire)", parts: [["front", "chest-upper"]] },
  "delt-ant":  { nom: "Deltoïde antérieur",          parts: [["front", "delt"]] },
  "delt-lat":  { nom: "Deltoïde latéral",            parts: [["front", "delt"], ["back", "delt"]] },
  "delt-post": { nom: "Deltoïde postérieur",         parts: [["back", "delt"]] },
  biceps:      { nom: "Biceps & brachial",           parts: [["front", "biceps"]] },
  triceps:     { nom: "Triceps",                     parts: [["front", "triceps"], ["back", "triceps"]] },
  "avant-bras":{ nom: "Avant-bras (brachio-radial)", parts: [["front", "forearm"], ["back", "forearm"]] },
  abdos:       { nom: "Grand droit de l'abdomen",    parts: [["front", "abs"]] },
  obliques:    { nom: "Obliques",                    parts: [["front", "obliques"]] },
  quadriceps:  { nom: "Quadriceps",                  parts: [["front", "quads"]] },
  adducteurs:  { nom: "Adducteurs",                  parts: [["front", "adductors"], ["back", "adductors"]] },
  ischios:     { nom: "Ischio-jambiers",             parts: [["back", "hams"]] },
  fessiers:    { nom: "Grand fessier",               parts: [["back", "glutes"]] },
  mollets:     { nom: "Mollets (gastrocnémien, soléaire)", parts: [["front", "calves"], ["back", "calves"]] },
  dorsaux:     { nom: "Grand dorsal",                parts: [["back", "lats"]] },
  "grand-rond":{ nom: "Grand rond & infra-épineux",  parts: [["back", "teres"]] },
  trapezes:    { nom: "Trapèzes & rhomboïdes",       parts: [["front", "traps"], ["back", "traps"]] },
  lombaires:   { nom: "Lombaires (érecteurs du rachis)", parts: [["back", "lowerback"]] },
  tibial:      { nom: "Tibial antérieur",            parts: [["front", "tibialis"]] }
};

window.SESSIONS = {
  A: { nom: "Séance A", jour: "Lundi",    dow: 1, focus: "Jambes · Poussée · Tirage" },
  B: { nom: "Séance B", jour: "Mercredi", dow: 3, focus: "Ischios · Poussée inclinée · Rowing" },
  C: { nom: "Séance C", jour: "Vendredi", dow: 5, focus: "Isolation · Dos · Bras" }
};

window.EXERCISES = [
  /* ───────── SÉANCE A ───────── */
  { id: "presse", s: "A", nom: "Presse à cuisses", machine: "Leg press 45°", series: 3, reps: [10, 12], repos: 120,
    P: ["quadriceps", "fessiers"], S: ["ischios", "adducteurs", "mollets"],
    reglage: "Dossier incliné pour que les hanches restent collées au siège en bas du mouvement.",
    etapes: [
      "Pieds à plat au milieu de la plateforme, écartés largeur d'épaules, pointes légèrement ouvertes.",
      "Déverrouille les sécurités, descends en 2 à 3 secondes jusqu'à ce que les genoux forment environ 90°.",
      "Pousse avec tout le pied (talons compris) en expirant, jusqu'à jambes presque tendues.",
      "Garde le bas du dos et les fesses collés au dossier pendant toute la série."
    ],
    erreurs: [
      "Décoller les fesses en bas : le bas du dos s'arrondit et encaisse la charge.",
      "Laisser les genoux rentrer vers l'intérieur.",
      "Verrouiller brutalement les genoux en haut."
    ],
    video: "leg press technique correcte" },

  { id: "dc-halteres", s: "A", nom: "Développé couché haltères", machine: "Banc plat + haltères", series: 3, reps: [8, 12], repos: 120,
    P: ["pecs"], S: ["delt-ant", "triceps"],
    reglage: "Banc plat. Assieds-toi haltères sur les cuisses, puis allonge-toi en les ramenant contre la poitrine.",
    etapes: [
      "Pieds au sol, omoplates serrées et abaissées, légère cambrure naturelle.",
      "Haltères au-dessus de la poitrine, bras tendus, paumes vers tes pieds.",
      "Descends en 2 à 3 secondes, coudes à environ 45° du buste, jusqu'à hauteur de poitrine.",
      "Pousse vers le haut en rapprochant légèrement les haltères, sans les cogner."
    ],
    erreurs: [
      "Coudes à 90° du corps (en croix) : stress inutile sur les épaules.",
      "Décoller les fesses du banc pour pousser plus lourd.",
      "Descendre trop vite et rebondir sur la poitrine."
    ],
    video: "développé couché haltères technique" },

  { id: "tirage-vertical", s: "A", nom: "Tirage vertical", machine: "Lat pulldown, barre large", series: 3, reps: [8, 12], repos: 120,
    P: ["dorsaux"], S: ["grand-rond", "biceps", "delt-post", "avant-bras"],
    reglage: "Règle le boudin pour bloquer fermement les cuisses.",
    etapes: [
      "Prise un peu plus large que les épaules, paumes vers l'avant.",
      "Buste légèrement incliné en arrière (10–20°), poitrine sortie.",
      "Tire la barre vers le haut de la poitrine en pensant « coudes vers les poches ».",
      "Remonte lentement jusqu'à bras tendus en gardant les épaules basses."
    ],
    erreurs: [
      "Tirer derrière la nuque.",
      "Se jeter en arrière pour utiliser l'élan.",
      "Hausser les épaules vers les oreilles en haut du mouvement."
    ],
    video: "lat pulldown technique tirage vertical" },

  { id: "elevations-laterales", s: "A", nom: "Élévations latérales", machine: "Haltères légers", series: 3, reps: [12, 15], repos: 75,
    P: ["delt-lat"], S: ["trapezes", "delt-ant"],
    reglage: "Prends léger : 4 à 8 kg suffisent pour commencer.",
    etapes: [
      "Debout, pieds largeur de hanches, buste très légèrement penché vers l'avant.",
      "Coudes légèrement fléchis et fixes pendant toute la série.",
      "Monte les bras sur les côtés jusqu'à hauteur des épaules, pas plus haut.",
      "Redescends en 2 à 3 secondes sans laisser tomber les haltères."
    ],
    erreurs: [
      "Hausser les épaules : les trapèzes prennent le relais.",
      "Balancer le buste pour lancer les haltères.",
      "Monter les mains plus haut que les coudes."
    ],
    video: "élévations latérales haltères technique" },

  { id: "curl-halteres", s: "A", nom: "Curl haltères", machine: "Haltères", series: 3, reps: [10, 12], repos: 75,
    P: ["biceps"], S: ["avant-bras"],
    reglage: "Debout, haltères le long du corps, paumes vers l'avant.",
    etapes: [
      "Coudes collés au buste, ils ne bougent pas.",
      "Monte les haltères en pliant les coudes, en expirant.",
      "Serre le biceps une seconde en haut.",
      "Redescends lentement jusqu'à bras presque tendus."
    ],
    erreurs: [
      "Balancer le dos pour monter la charge.",
      "Avancer les coudes en haut du mouvement.",
      "Ne pas redescendre complètement (amplitude coupée)."
    ],
    video: "curl haltères biceps technique" },

  { id: "planche", s: "A", nom: "Planche", machine: "Au sol, sur tapis", series: 3, reps: [30, 45], type: "time", repos: 60,
    P: ["abdos"], S: ["obliques", "delt-ant", "fessiers", "quadriceps"],
    reglage: "Sur un tapis, avant-bras au sol.",
    etapes: [
      "Coudes sous les épaules, avant-bras parallèles.",
      "Corps aligné de la tête aux talons, regard vers le sol.",
      "Serre les fessiers et rentre le nombril, respire calmement.",
      "Note la durée tenue en secondes dans la colonne « sec »."
    ],
    erreurs: [
      "Laisser le bassin s'affaisser : le bas du dos se creuse.",
      "Monter les fesses trop haut.",
      "Bloquer la respiration."
    ],
    video: "gainage planche technique" },

  /* ───────── SÉANCE B ───────── */
  { id: "leg-curl-assis", s: "B", nom: "Leg curl assis", machine: "Machine leg curl assis", series: 3, reps: [10, 12], repos: 90,
    P: ["ischios"], S: ["mollets"],
    reglage: "Genou aligné avec l'axe de rotation (point rouge/jaune sur la machine). Boudin juste au-dessus des chevilles, cuisses bloquées.",
    etapes: [
      "Dos bien calé contre le dossier, mains sur les poignées.",
      "Ramène les talons sous le siège en contractant l'arrière des cuisses.",
      "Marque une demi-seconde en bas.",
      "Remonte lentement en 2 à 3 secondes."
    ],
    erreurs: [
      "Décoller les hanches du siège.",
      "Donner un à-coup pour lancer la charge.",
      "Laisser la charge remonter d'un coup."
    ],
    video: "seated leg curl technique" },

  { id: "dev-incline-machine", s: "B", nom: "Développé incliné machine", machine: "Chest press inclinée", series: 3, reps: [8, 12], repos: 120,
    P: ["pecs-haut"], S: ["delt-ant", "triceps"],
    reglage: "Règle le siège pour que les poignées arrivent au niveau du haut de la poitrine.",
    etapes: [
      "Dos et tête contre le dossier, omoplates serrées.",
      "Pousse les poignées devant toi en expirant, sans verrouiller les coudes.",
      "Reviens lentement jusqu'à sentir l'étirement des pectoraux.",
      "Garde les poignets droits, alignés avec les avant-bras."
    ],
    erreurs: [
      "Décoller les épaules du dossier en poussant.",
      "Siège trop bas : les épaules travaillent à la place des pectoraux.",
      "Laisser la charge retomber."
    ],
    video: "incline chest press machine technique" },

  { id: "low-row", s: "B", nom: "Rowing assis / Low Row", machine: "Poulie basse ou low row", series: 3, reps: [8, 12], repos: 120,
    P: ["dorsaux", "grand-rond"], S: ["trapezes", "biceps", "delt-post", "avant-bras"],
    reglage: "Pieds calés, genoux légèrement fléchis.",
    etapes: [
      "Buste droit, poitrine haute, bras tendus devant.",
      "Tire les poignées vers le nombril en ramenant les coudes derrière toi.",
      "Serre les omoplates une seconde.",
      "Reviens bras tendus en laissant les épaules s'avancer légèrement, sans arrondir le dos."
    ],
    erreurs: [
      "Se balancer d'avant en arrière.",
      "Arrondir le bas du dos.",
      "Tirer uniquement avec les bras."
    ],
    video: "seated cable row technique" },

  { id: "dev-epaules-machine", s: "B", nom: "Développé épaules machine", machine: "Shoulder press machine", series: 3, reps: [8, 12], repos: 120,
    P: ["delt-ant", "delt-lat"], S: ["triceps", "trapezes"],
    reglage: "Poignées à hauteur d'épaules quand tu es assis.",
    etapes: [
      "Dos collé au dossier, pieds bien au sol.",
      "Pousse vers le haut en expirant jusqu'à bras presque tendus.",
      "Redescends sous contrôle jusqu'à hauteur d'oreilles.",
      "Garde les abdominaux serrés pour ne pas cambrer."
    ],
    erreurs: [
      "Cambrer fortement le bas du dos.",
      "Verrouiller les coudes en haut.",
      "Descendre trop bas si l'épaule tire."
    ],
    video: "machine shoulder press technique" },

  { id: "triceps-corde", s: "B", nom: "Triceps poulie corde", machine: "Poulie haute + corde", series: 3, reps: [10, 15], repos: 75,
    P: ["triceps"], S: ["avant-bras"],
    reglage: "Poulie en position haute, accessoire corde.",
    etapes: [
      "Debout, buste légèrement penché, coudes collés au corps.",
      "Pousse la corde vers le bas jusqu'à bras tendus.",
      "En bas, écarte légèrement les deux extrémités de la corde.",
      "Remonte lentement jusqu'à avant-bras à l'horizontale, coudes fixes."
    ],
    erreurs: [
      "Laisser les coudes partir vers l'avant.",
      "Utiliser le poids du corps pour descendre.",
      "Remonter les mains trop haut (au-dessus de la poitrine)."
    ],
    video: "triceps pushdown corde technique" },

  { id: "crunch-machine", s: "B", nom: "Crunch machine", machine: "Ab crunch machine", series: 3, reps: [12, 15], repos: 60,
    P: ["abdos"], S: ["obliques"],
    reglage: "Règle le siège pour que les poignées ou coussins soient à hauteur d'épaules.",
    etapes: [
      "Pieds calés, bassin stable.",
      "Enroule le buste vers le bassin en expirant, comme pour rapprocher côtes et nombril.",
      "Marque une seconde en contraction.",
      "Reviens lentement sans relâcher complètement la tension."
    ],
    erreurs: [
      "Tirer avec les bras.",
      "Donner des à-coups.",
      "Prendre trop lourd et compenser avec les hanches."
    ],
    video: "ab crunch machine technique" },

  /* ───────── SÉANCE C ───────── */
  { id: "leg-extension", s: "C", nom: "Leg extension", machine: "Machine leg extension", series: 3, reps: [10, 15], repos: 75,
    P: ["quadriceps"], S: [],
    reglage: "Genou aligné avec l'axe de la machine, boudin juste au-dessus des chevilles.",
    etapes: [
      "Dos contre le dossier, mains sur les poignées.",
      "Tends les jambes en expirant.",
      "Serre les quadriceps une seconde en haut.",
      "Redescends en 2 à 3 secondes."
    ],
    erreurs: [
      "Claquer les genoux en extension.",
      "Décoller les fesses du siège.",
      "Laisser la charge retomber."
    ],
    video: "leg extension technique" },

  { id: "pec-deck", s: "C", nom: "Pec Deck", machine: "Butterfly / pec fly", series: 3, reps: [10, 15], repos: 75,
    P: ["pecs"], S: ["delt-ant"],
    reglage: "Siège réglé pour que les poignées soient à hauteur de poitrine.",
    etapes: [
      "Dos au dossier, poitrine ouverte, coudes légèrement fléchis.",
      "Rapproche les poignées devant la poitrine en serrant les pectoraux.",
      "Marque une seconde.",
      "Ouvre lentement jusqu'à sentir un étirement, pas plus."
    ],
    erreurs: [
      "Arrondir les épaules vers l'avant.",
      "Ouvrir trop loin en arrière.",
      "Pousser avec les mains au lieu de serrer avec les pectoraux."
    ],
    video: "pec deck butterfly technique" },

  { id: "tirage-neutre", s: "C", nom: "Tirage horizontal prise neutre", machine: "Poulie basse, poignée V", series: 3, reps: [8, 12], repos: 120,
    P: ["dorsaux", "grand-rond"], S: ["trapezes", "biceps", "delt-post"],
    reglage: "Poignée triangle (V), paumes face à face.",
    etapes: [
      "Buste droit, poitrine haute, genoux légèrement fléchis.",
      "Tire vers le bas du ventre en gardant les coudes près du corps.",
      "Serre les omoplates une seconde.",
      "Tends les bras sous contrôle."
    ],
    erreurs: [
      "Se balancer pour tirer.",
      "Arrondir le dos en fin de mouvement.",
      "Hausser les épaules."
    ],
    video: "seated cable row v handle technique" },

  { id: "mollets-machine", s: "C", nom: "Mollets machine", machine: "Mollets debout ou assis", series: 3, reps: [12, 20], repos: 60,
    P: ["mollets"], S: [],
    reglage: "Avant du pied sur le bord de la plateforme, talons dans le vide.",
    etapes: [
      "Jambes presque tendues, genoux souples.",
      "Monte le plus haut possible sur la pointe des pieds.",
      "Marque une seconde en haut.",
      "Redescends lentement jusqu'à étirement des mollets."
    ],
    erreurs: [
      "Rebondir en bas du mouvement.",
      "Faire des demi-répétitions.",
      "Plier les genoux pour aider."
    ],
    video: "calf raise machine technique" },

  { id: "curl-marteau", s: "C", nom: "Curl marteau alterné", machine: "Haltères", series: 3, reps: [10, 12], parBras: true, repos: 75,
    P: ["biceps", "avant-bras"], S: [],
    reglage: "Debout, paumes face au corps (prise neutre).",
    etapes: [
      "Coudes collés au buste.",
      "Monte un haltère sans tourner le poignet.",
      "Redescends lentement, puis change de bras.",
      "Note les répétitions par bras."
    ],
    erreurs: [
      "Balancer le buste.",
      "Faire tourner le poignet.",
      "Avancer les coudes."
    ],
    video: "hammer curl alterné technique" },

  { id: "dips-assistes", s: "C", nom: "Dips assistés machine", machine: "Machine dips/tractions assistés", series: 3, reps: [8, 12], repos: 120, assist: true,
    P: ["triceps", "pecs"], S: ["delt-ant"],
    reglage: "Genoux sur le coussin. Le poids choisi t'AIDE : moins de kg = plus difficile. La photo montre le même mouvement aux barres parallèles.",
    etapes: [
      "Mains sur les poignées, bras tendus, épaules basses.",
      "Descends en pliant les coudes jusqu'à environ 90°.",
      "Garde le buste légèrement penché en avant.",
      "Pousse pour remonter sans verrouiller brutalement."
    ],
    erreurs: [
      "Descendre trop bas si l'épaule fait mal.",
      "Laisser les épaules monter vers les oreilles.",
      "Rebondir en bas."
    ],
    video: "assisted dip machine technique" }
];

window.CARDIO = {
  nom: "Marche inclinée sur tapis",
  duree: [15, 20],
  P: ["fessiers", "mollets"], S: ["ischios", "quadriceps"],
  niveaux: [
    { nom: "Débutant",      incl: "5–7 %",   vit: "4,5–5 km/h" },
    { nom: "Intermédiaire", incl: "8–10 %",  vit: "5–5,5 km/h" },
    { nom: "Avancé",        incl: "11–15 %", vit: "5,5–6 km/h" }
  ],
  conseil: "Tu dois pouvoir parler, mais pas chanter. Ne te tiens pas aux barres : ça annule l'effet de la pente."
};
