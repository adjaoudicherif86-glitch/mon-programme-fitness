# 🏋️ Mon Programme Fitness : mon carnet d'entraînement, 100 % gratuit

Une application web en noir et blanc pour suivre mon programme full body (séances A, B et C, 3 fois par semaine) à la salle, depuis mon iPhone ou mon ordinateur.

- **18 exercices**, chacun avec deux vraies photos (position de départ et d'arrivée), le réglage de la machine, l'exécution pas à pas, les erreurs à éviter et un lien vers des vidéos.
- **Planche anatomique face + dos** pour chaque exercice : le muscle principal est en **blanc plein**, les muscles secondaires sont **hachurés**, avec la légende en français.
- **Enregistrement des séries** : charge, répétitions, statut fait / non fait, note par exercice, date. La dernière performance est affichée à côté de chaque série et proposée automatiquement la fois suivante.
- **Sauvegarde automatique** à chaque saisie : tu peux fermer l'appli en pleine séance et la reprendre.
- **Historique** daté, modifiable, avec corbeille (rien n'est écrasé ni supprimé sans confirmation).
- **Progrès** : assiduité sur 4 semaines, semaines complètes d'affilée, records battus en 30 jours, calendrier des 12 dernières semaines, carte des muscles travaillés dans la semaine, volume par semaine, et par exercice : charge max, 1RM estimé, volume, progression en %.
- **Coach de progression** (double progression) : quand tu fais le haut de la fourchette sur toutes les séries, l'appli te dit de monter d'un cran ; sinon elle te donne les répétitions à viser. Elle signale aussi 3 séances sans progrès.
- **Poids** : pesées, moyenne sur 7 jours, tendance par semaine, reste à perdre jusqu'à **77 kg**, date d'arrivée estimée, tour de taille facultatif.
- **Synchronisation iPhone ↔ ordinateur** via un dépôt GitHub privé (ou Supabase), facultative.
- **Bibliothèque de 750 exercices** : pendant une séance, « + Ajouter un exercice » → recherche en français ou en anglais (« curl barre », « squat »…), filtres par muscle et par matériel, photo, muscles ciblés. Tu peux aussi créer ton propre exercice, et choisir de l'ajouter automatiquement aux prochaines séances A, B ou C (à retirer depuis l'onglet Programme). Les exercices ajoutés ont leurs records, leur courbe et le coach de progression comme les autres.
- **Programme modifiable** : onglet Programme → « Modifier la séance » → **Retirer** un exercice (ex. les mollets de la séance C) ou le **Remettre**, et « + Ajouter un exercice à la séance » depuis la bibliothèque. L'historique et les records ne sont jamais supprimés. Synchronisé entre tes appareils.
- **Coach** (Progrès → Coach) :
  - **Bilan de la semaine automatique** dès l'ouverture : chiffres clés, points positifs, points à améliorer, records, priorités (calculé sur l'appareil, instantané). Avec une clé Gemini, l'**avis du coach IA** s'écrit tout seul en dessous (mis en cache, rafraîchi quand tes données changent).
  - **Alertes automatiques**, gratuites et hors ligne : séances manquées, stagnation, baisse de forme, exercices prêts à monter en charge, records, muscles délaissés, perte de poids trop rapide ou qui remonte, pesée oubliée. Les alertes importantes s'affichent aussi sur l'accueil.
  - **Coach IA** (Gemini de Google, gratuit avec ta propre clé créée sur https://aistudio.google.com/apikey) : tu lui poses tes questions (« est-ce que je progresse ? », « comment faire tel exercice ? », bilan de la semaine…) et il répond à partir de tes séances, records et poids. La clé reste sur l'appareil. Un résumé de tes données est envoyé à Google à chaque question (option pour ne pas partager le poids) ; sur l'offre gratuite, Google peut utiliser ces échanges pour améliorer ses services. Quota gratuit limité par jour.
- **Nutrition** (onglet Nutrition → Repas / Poids) : journal du jour par repas (petit-déjeuner, déjeuner, collation, dîner), calories et protéines/glucides/lipides face à tes objectifs, moyenne des 7 derniers jours. Quatre façons d'ajouter :
  - **Photo du plat** : Gemini (même clé que le coach) reconnaît les aliments et estime grammes et calories ; tu corriges avant d'enregistrer. C'est une estimation.
    Après l'analyse, chaque aliment détecté peut être **modifié ou détaillé** : « ✎ Modifier / détailler les ingrédients » → tu ajoutes ce qu'il y a dedans avec les grammes (ex. salade de pâtes = pâtes cuites 150 g + thon 60 g + pesto 20 g), et les calories, protéines, glucides et lipides sont recalculés (table Ciqual ; un ingrédient introuvable peut être estimé par l'IA). « + Ajouter un aliment oublié » complète l'assiette. Les ingrédients restent modifiables ensuite depuis le journal.
  - **Code-barres** : scan avec la caméra (ou saisie des chiffres), valeurs exactes d'Open Food Facts.
  - **Recherche** dans la table officielle **Ciqual 2025** de l'Anses (3 341 aliments, utilisable hors ligne).
  - **Saisie libre**.
  Objectifs calculés à partir de ton poids, ta taille, ton âge et ton activité (formule de Mifflin-St Jeor, déficit modéré pour perdre environ 0,4 à 0,6 kg par semaine, ~1,8 g de protéines par kg), ou fixés à la main. Le coach en tient compte dans son bilan.
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

Chaque appareil garde **toutes** tes données dans son navigateur, même sans réseau. Attention : l'appli installée sur l'iPhone, Safari sur ton ordinateur et l'aperçu ouvert dans Claude sont **trois endroits séparés**. Sans synchronisation, ce que tu notes sur l'un n'apparaît pas sur les autres.

- Les mises à jour de l'appli **n'effacent rien** : les données restent au même endroit, et la V6 garde en plus une copie de sécurité de tes données V5 (⚙ → bouton « Copie de sécurité V5 »).
- Exporte une sauvegarde de temps en temps : ⚙ → **Exporter une sauvegarde**. L'import fusionne sans créer de doublon.

## Synchroniser l'iPhone et l'ordinateur avec GitHub (recommandé, gratuit, ~5 min)

Tes séances, pesées et ton objectif sont enregistrés dans un fichier `carnet.json` rangé dans un **dépôt GitHub privé**, à part de l'appli. Chaque appareil le lit et le met à jour avec un **jeton** qui ne donne accès qu'à ce dépôt-là.

1. **Créer le dépôt privé** : https://github.com/new → nom `mon-programme-fitness-data` → coche **Private** → coche **Add a README file** → **Create repository**.
2. **Créer le jeton** : https://github.com/settings/personal-access-tokens/new
   - *Token name* : `carnet fitness` · *Expiration* : 1 an (366 days) ou ce que GitHub propose de plus long
   - *Repository access* : **Only select repositories** → choisis `mon-programme-fitness-data` (et rien d'autre)
   - *Permissions* → *Repository permissions* → **Contents : Read and write**
   - **Generate token** → copie le jeton (il commence par `github_pat_`). GitHub ne l'affiche qu'une fois.
3. **Sur le téléphone d'abord** (c'est lui qui a tes séances) : ⚙ → Synchronisation → colle le jeton → **Connecter et synchroniser**.
4. **Sur l'ordinateur** : ouvre l'adresse de l'appli → ⚙ → colle le même jeton → **Connecter et synchroniser**.

Sécurité :
- Le jeton reste **seulement sur l'appareil** : il n'est jamais écrit dans le code, ni dans le dépôt, ni dans les sauvegardes exportées.
- L'appli refuse un dépôt public.
- Si tu perds ton téléphone : https://github.com/settings/personal-access-tokens → supprime le jeton, puis crée-en un nouveau.
- À l'expiration du jeton, l'appli affiche « Jeton invalide ou expiré » : recrée-en un (étape 2) et recolle-le.
- Chaque synchronisation crée un commit dans le dépôt privé : GitHub garde donc l'historique de toutes les versions de ton carnet.

## Variante : synchroniser avec Supabase (au lieu de GitHub)

1. Va sur https://supabase.com → **Start your project** → connecte-toi avec ton compte GitHub.
2. **New project** : nom `mon-programme-fitness`, choisis un mot de passe de base de données (garde-le pour toi, l'appli n'en a pas besoin), région **Europe (Frankfurt ou Paris)**, offre **Free**. Attends 2 minutes.
3. Menu de gauche **SQL Editor** → **New query** → colle **tout** le contenu du fichier `supabase/schema.sql` de ce dépôt → **Run**. Tu dois voir « Success ».
4. **Authentication → URL Configuration** : dans **Site URL**, mets `https://adjaoudicherif86-glitch.github.io/mon-programme-fitness/`, et ajoute la même adresse dans **Redirect URLs**. Save.
5. Bouton **Connect** (en haut) ou **Project Settings → API Keys** : copie le **Project URL** (`https://xxxx.supabase.co`) et la clé **publishable** (`sb_publishable_…`), ou la clé `anon` si c'est la seule proposée. Ces deux valeurs peuvent être publiques. **Ne copie jamais la clé « secret » ni « service_role ».**
6. Colle-les dans `docs/config.js` (ou envoie-les à Claude pour qu'il le fasse). Tu peux aussi les coller dans l'appli : ⚙ → Synchronisation.
7. **Commence par le téléphone** (c'est lui qui a tes séances) : ⚙ → Synchronisation → e-mail + mot de passe → **Créer mon compte** → clique sur le lien reçu par e-mail → reviens dans l'appli → **Se connecter**. Tes séances et pesées partent dans ton compte.
8. Sur l'ordinateur : ouvre l'adresse de l'appli → ⚙ → **Se connecter** avec le même compte. Tout arrive.
9. Sécurité : une fois ton compte créé, dans Supabase va dans **Authentication → Sign In / Providers** et désactive **Allow new users to sign up**. Personne d'autre ne pourra créer de compte sur ton projet.

Comment ça marche : l'appli enregistre toujours d'abord sur l'appareil, puis envoie et reçoit les changements à l'ouverture, après chaque séance ou pesée, et quand le réseau revient. Si une même séance a été modifiée sur deux appareils avant la synchro, **les deux versions sont gardées** (badge « conflit ») : rien n'est écrasé en silence. Une séance en cours reste sur l'appareil où tu l'as commencée tant qu'elle n'est pas terminée. Chaque utilisateur ne peut lire que ses propres données (règles RLS dans `supabase/schema.sql`).

## Modifier le programme

Tout le programme est dans `docs/data.js` (texte en français). Sur GitHub : ouvre le fichier → icône crayon ✏️ → modifie le texte entre guillemets (nom, séries, répétitions, consignes) → **Commit changes**. L'appli se met à jour en 1 à 3 minutes. Ton historique n'est pas touché.

Si tu modifies le code, change aussi la ligne `const VERSION = "mpf-6.0.0";` dans `docs/sw.js` (par exemple `mpf-6.0.1`) : c'est ce qui dit aux téléphones de télécharger la nouvelle version. L'appli affichera « Nouvelle version disponible → Recharger ».

## Organisation des fichiers

```
docs/
  index.html            la page
  app.css               le design noir et blanc
  app.js                le fonctionnement (séances, enregistrement, historique, graphiques)
  data.js               le programme : séances, exercices, muscles, consignes
  anatomy-data.js       les tracés de la planche anatomique
  img/ex/               36 photos (départ = -0, arrivée = -1)
  img/lib/              miniatures de la bibliothèque
  library.json          bibliothèque d'exercices (générée par tools/build_library.py)
  fonts/                police Archivo (hébergée ici, marche hors ligne)
  icons/                icônes de l'application
  manifest.webmanifest  fiche d'installation (PWA)
  sw.js                 fonctionnement hors ligne
  config.js             adresse + clé publique Supabase (synchro)
  vendor/               bibliothèque supabase-js (hébergée ici)
supabase/
  schema.sql            tables, sécurité RLS, vue « series »
```

## Crédits et licences

- **Bibliothèque** : noms traduits en français (95 à la main, les autres par règles automatiques ; le nom anglais d'origine est toujours affiché), instructions d'origine en anglais. Les grandes photos sont chargées depuis le dépôt free-exercise-db puis gardées pour le hors-ligne.
- **Photos des exercices** : [free-exercise-db](https://github.com/yuhonas/free-exercise-db), base dédiée au domaine public (licence Unlicense), converties en noir et blanc. Le dépôt ne documente pas le photographe d'origine ; si un ayant droit se manifeste, les photos seront remplacées.
- **Planches anatomiques** : tracés de [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter), licence MIT © 2022 ELABBASSI Hicham, découpés par muscle et recolorés.
- **Synchronisation** : [supabase-js](https://github.com/supabase/supabase-js), licence MIT.
- **Aliments** : table de composition nutritionnelle Ciqual 2025, Anses (Licence Ouverte / Etalab 2.0) ; produits emballés : Open Food Facts (ODbL) ; lecture des codes-barres : ZXing (licence Apache 2.0).
- **Police** : [Archivo](https://github.com/Omnibus-Type/Archivo), SIL Open Font License 1.1.
- Les vidéos sont des recherches YouTube ciblées (aucune vidéo n'est copiée dans l'appli).

Les conseils techniques ne remplacent pas l'avis d'un coach ou d'un professionnel de santé.
