# 🏋️ Mon Programme Fitness : mon carnet d'entraînement, 100 % gratuit

Une application web en noir et blanc pour suivre mon programme full body (séances A, B et C, 3 fois par semaine) à la salle, depuis mon iPhone ou mon ordinateur.

- **18 exercices**, chacun avec deux vraies photos (position de départ et d'arrivée), le réglage de la machine, l'exécution pas à pas, les erreurs à éviter et un lien vers des vidéos.
- **Planche anatomique face + dos** pour chaque exercice : le muscle principal est en **blanc plein**, les muscles secondaires sont **hachurés**, avec la légende en français.
- **Enregistrement des séries** : charge, répétitions, statut fait / non fait, note par exercice, date. La dernière performance est affichée à côté de chaque série et proposée automatiquement la fois suivante.
- **Sauvegarde automatique** à chaque saisie : tu peux fermer l'appli en pleine séance et la reprendre.
- **Historique** daté, modifiable, avec corbeille (rien n'est écrasé ni supprimé sans confirmation).
- **Progrès** : volume par semaine, courbe de charge par exercice, records.
- **Minuteur de repos** qui démarre quand tu valides une série.
- **Cardio** : marche inclinée 15–20 min avec 3 niveaux.
- **Installable sur l'écran d'accueil** de l'iPhone (PWA) et utilisable sans réseau une fois ouverte une première fois.

Coût total : 0 €. GitHub Pages héberge l'application.

Adresse de l'appli : **https://adjaoudicherif86-glitch.github.io/mon-programme-fitness/**

## Mise en ligne (une seule fois)

1. Ouvre le dépôt sur GitHub : `https://github.com/adjaoudicherif86-glitch/mon-programme-fitness`
2. Clique sur **Settings** (l'onglet en haut à droite du dépôt).
3. Dans le menu de gauche, clique sur **Pages**.
4. Sous « Build and deployment » → **Source** : choisis « Deploy from a branch ».
5. **Branch** : choisis `main`, puis le dossier **`/docs`**, puis **Save**.
6. Attends 1 à 3 minutes, recharge la page **Settings → Pages** : un cadre affiche « Your site is live at… ». Clique sur le lien.

## Installer l'appli sur l'iPhone

1. Ouvre l'adresse de l'appli dans **Safari** (pas Chrome : sur iPhone, seul Safari sait bien l'installer).
2. Touche le bouton **Partager** (le carré avec une flèche vers le haut).
3. Fais défiler et choisis **« Sur l'écran d'accueil »**, puis **Ajouter**.
4. Lance toujours l'appli depuis cette icône : c'est là que tes séances sont enregistrées.

## Utiliser l'appli à la salle

1. Touche le gros bouton ▶ en bas, puis la séance du jour.
2. Pour chaque série : tape la charge et les répétitions, puis touche **✓**. La ligne devient blanche et le minuteur de repos démarre.
3. La colonne « Précédent » montre ce que tu as fait la dernière fois. Si tu refais pareil, touche directement **✓** : les valeurs sont reprises toutes seules. Touche la valeur grise pour la recopier puis la modifier.
4. **+ Série** ajoute une série, « Ajouter une note » garde un réglage (ex. « siège cran 4 »).
5. À la fin : **Terminer la séance** → vérifie la date → **Enregistrer dans l'historique**.

Pour la planche, la colonne « sec » sert à noter la durée tenue. Pour les dips assistés, le poids est une **aide** : moins de kg = plus difficile, l'appli en tient compte dans les records.

## Où sont mes données ? (important)

Tes séances sont enregistrées **dans le navigateur de l'appareil** (stockage local). Concrètement :

- Elles restent si tu fermes l'appli, éteins le téléphone ou mets l'appli à jour.
- Elles ne passent **pas** toutes seules de ton iPhone à ton ordinateur.
- Safari peut effacer les données d'un site qu'on n'ouvre plus pendant plusieurs semaines. L'appli installée sur l'écran d'accueil est mieux protégée, mais **exporte une sauvegarde chaque semaine** : icône ⚙ sur l'accueil → **Exporter une sauvegarde** → enregistre le fichier dans Fichiers / iCloud Drive.
- Pour retrouver tes données sur un autre appareil : ⚙ → **Importer une sauvegarde**. L'import fusionne sans créer de doublon.
- Ton ancien fichier de sauvegarde de la V4 (`mes-series-fitness.json`) s'importe de la même façon.

**Étape suivante prévue :** synchronisation automatique iPhone ↔ ordinateur avec un compte Supabase gratuit (connexion sécurisée, une base de données privée à toi, aucune clé secrète dans le code).

## Modifier le programme

Tout le programme est dans `docs/data.js` (texte en français). Sur GitHub : ouvre le fichier → icône crayon ✏️ → modifie le texte entre guillemets (nom, séries, répétitions, consignes) → **Commit changes**. L'appli se met à jour en 1 à 3 minutes. Ton historique n'est pas touché.

Si tu modifies le code, change aussi la ligne `const VERSION = "mpf-5.0.0";` dans `docs/sw.js` (par exemple `mpf-5.0.1`) : c'est ce qui dit aux téléphones de télécharger la nouvelle version. L'appli affichera « Nouvelle version disponible → Recharger ».

## Organisation des fichiers

```
docs/
  index.html            la page
  app.css               le design noir et blanc
  app.js                le fonctionnement (séances, enregistrement, historique, graphiques)
  data.js               le programme : séances, exercices, muscles, consignes
  anatomy-data.js       les tracés de la planche anatomique
  img/ex/               36 photos (départ = -0, arrivée = -1)
  fonts/                police Archivo (hébergée ici, marche hors ligne)
  icons/                icônes de l'application
  manifest.webmanifest  fiche d'installation (PWA)
  sw.js                 fonctionnement hors ligne
```

## Crédits et licences

- **Photos des exercices** : [free-exercise-db](https://github.com/yuhonas/free-exercise-db), base dédiée au domaine public (licence Unlicense), converties en noir et blanc. Le dépôt ne documente pas le photographe d'origine ; si un ayant droit se manifeste, les photos seront remplacées.
- **Planches anatomiques** : tracés de [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter), licence MIT © 2022 ELABBASSI Hicham, découpés par muscle et recolorés.
- **Police** : [Archivo](https://github.com/Omnibus-Type/Archivo), SIL Open Font License 1.1.
- Les vidéos sont des recherches YouTube ciblées (aucune vidéo n'est copiée dans l'appli).

Les conseils techniques ne remplacent pas l'avis d'un coach ou d'un professionnel de santé.
