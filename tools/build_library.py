"""Construit docs/library.json (bibliothèque d'exercices) à partir de free-exercise-db (domaine public).
Usage : python3 tools/build_library.py CHEMIN/free-exercise-db
- noms traduits en français (règles + liste manuelle), nom anglais conservé
- muscles convertis vers les zones de la planche anatomique
- miniatures noir et blanc dans docs/img/lib/ (photos complètes chargées depuis GitHub)"""
import json, re, sys, os, unicodedata
from PIL import Image, ImageOps, ImageEnhance

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), "..", "docs")
COMMIT = sys.argv[2] if len(sys.argv) > 2 else "main"

# ── Noms écrits à la main pour les exercices les plus courants ──
MANUAL = {
 "Barbell Curl": "Curl barre debout", "Dumbbell Bicep Curl": "Curl haltères", "Hammer Curls": "Curl marteau",
 "Alternate Hammer Curl": "Curl marteau alterné", "EZ-Bar Curl": "Curl barre EZ", "Preacher Curl": "Curl au pupitre (barre)",
 "Concentration Curls": "Curl concentré", "Cable Hammer Curls - Rope Attachment": "Curl marteau à la poulie (corde)",
 "Barbell Bench Press - Medium Grip": "Développé couché barre", "Dumbbell Bench Press": "Développé couché haltères",
 "Barbell Incline Bench Press - Medium Grip": "Développé incliné barre", "Incline Dumbbell Press": "Développé incliné haltères",
 "Decline Barbell Bench Press": "Développé décliné barre", "Close-Grip Barbell Bench Press": "Développé couché prise serrée",
 "Barbell Squat": "Squat barre", "Front Barbell Squat": "Squat avant barre", "Goblet Squat": "Goblet squat",
 "Leg Press": "Presse à cuisses", "Hack Squat": "Hack squat (barre)", "Barbell Deadlift": "Soulevé de terre",
 "Romanian Deadlift": "Soulevé de terre roumain", "Stiff-Legged Barbell Deadlift": "Soulevé de terre jambes tendues",
 "Sumo Deadlift": "Soulevé de terre sumo", "Pullups": "Tractions", "Chin-Up": "Tractions en supination",
 "Pushups": "Pompes", "Wide-Grip Lat Pulldown": "Tirage vertical prise large", "Close-Grip Front Lat Pulldown": "Tirage vertical prise serrée",
 "V-Bar Pulldown": "Tirage vertical poignée V", "Seated Cable Rows": "Rowing assis à la poulie",
 "Bent Over Barbell Row": "Rowing barre buste penché", "One-Arm Dumbbell Row": "Rowing haltère à un bras",
 "T-Bar Row with Handle": "Rowing T-bar", "Upright Barbell Row": "Rowing menton barre",
 "Standing Military Press": "Développé militaire debout", "Seated Barbell Military Press": "Développé militaire assis",
 "Dumbbell Shoulder Press": "Développé épaules haltères", "Arnold Dumbbell Press": "Développé Arnold",
 "Side Lateral Raise": "Élévations latérales", "Front Dumbbell Raise": "Élévations frontales haltères",
 "Reverse Flyes": "Oiseau haltères", "Reverse Machine Flyes": "Oiseau à la machine (pec deck inversé)",
 "Face Pull": "Face pull", "Barbell Shrug": "Shrugs barre", "Dumbbell Shrug": "Shrugs haltères",
 "Dumbbell Flyes": "Écarté couché haltères", "Incline Dumbbell Flyes": "Écarté incliné haltères", "Butterfly": "Pec deck (butterfly)",
 "Cable Crossover": "Écarté à la poulie vis-à-vis", "Dips - Chest Version": "Dips (version pectoraux)",
 "Dips - Triceps Version": "Dips (version triceps)", "Bench Dips": "Dips sur banc",
 "Triceps Pushdown": "Extension triceps à la poulie", "Triceps Pushdown - Rope Attachment": "Extension triceps à la poulie (corde)",
 "EZ-Bar Skullcrusher": "Barre au front (barre EZ)", "Lying Triceps Press": "Barre au front", "Tricep Dumbbell Kickback": "Kickback triceps haltère",
 "Standing Dumbbell Triceps Extension": "Extension triceps haltère au-dessus de la tête",
 "Leg Extensions": "Leg extension", "Lying Leg Curls": "Leg curl allongé", "Seated Leg Curl": "Leg curl assis",
 "Standing Calf Raises": "Mollets debout (machine)", "Seated Calf Raise": "Mollets assis (machine)",
 "Barbell Lunge": "Fentes barre", "Dumbbell Lunges": "Fentes haltères", "Bodyweight Walking Lunge": "Fentes marchées",
 "Barbell Hip Thrust": "Hip thrust barre", "Butt Lift (Bridge)": "Pont fessier", "Hyperextensions (Back Extensions)": "Extensions lombaires (banc à 45°)",
 "Plank": "Planche", "Crunches": "Crunch", "Ab Crunch Machine": "Crunch à la machine", "Cable Crunch": "Crunch à la poulie (à genoux)",
 "Hanging Leg Raise": "Relevé de jambes suspendu", "Russian Twist": "Russian twist", "Ab Roller": "Roue abdominale",
 "Kettlebell One-Legged Deadlift": "Soulevé de terre une jambe kettlebell", "Two-Arm Kettlebell Swing": "Kettlebell swing",
 "Smith Machine Squat": "Squat à la Smith machine", "Smith Machine Bench Press": "Développé couché à la Smith machine",
 "Machine Shoulder (Military) Press": "Développé épaules à la machine", "Leverage Chest Press": "Développé couché à la machine",
 "Leverage Incline Chest Press": "Développé incliné à la machine", "Machine Bench Press": "Développé couché à la machine",
 "Power Clean": "Épaulé en puissance", "Clean and Jerk": "Épaulé-jeté", "Snatch": "Arraché",
 "Farmer's Walk": "Marche du fermier", "Walking, Treadmill": "Marche sur tapis", "Jogging, Treadmill": "Course sur tapis",
 "Bicycling, Stationary": "Vélo d'appartement", "Rowing, Stationary": "Rameur", "Elliptical Trainer": "Vélo elliptique",
 "Rope Jumping": "Corde à sauter", "Stairmaster": "Simulateur d'escaliers", "Box Jump (Multiple Response)": "Box jump",
}

EQUIP = {"barbell": "barre", "dumbbell": "haltères", "cable": "poulie", "machine": "machine", "kettlebells": "kettlebell",
         "bands": "élastique", "e-z curl bar": "barre EZ", "body only": "poids du corps", "medicine ball": "médecine-ball",
         "exercise ball": "swiss ball", "foam roll": "rouleau", "other": "autre", None: "autre"}
CAT = {"strength": "Musculation", "powerlifting": "Force", "olympic weightlifting": "Haltérophilie", "strongman": "Strongman",
       "plyometrics": "Pliométrie", "cardio": "Cardio"}
MUSC = {"abdominals": ["abdos"], "abductors": ["abducteurs"], "adductors": ["adducteurs"], "biceps": ["biceps"], "calves": ["mollets"],
        "chest": ["pecs"], "forearms": ["avant-bras"], "glutes": ["fessiers"], "hamstrings": ["ischios"], "lats": ["dorsaux"],
        "lower back": ["lombaires"], "middle back": ["grand-rond", "trapezes"], "neck": ["trapezes"], "quadriceps": ["quadriceps"],
        "shoulders": ["epaules"], "traps": ["trapezes"], "triceps": ["triceps"]}

# Règles de traduction automatique : (motif anglais, cœur du nom français), du plus précis au plus général
CORE = [
 (r"bench press", "Développé couché"), (r"leg press", "Presse à cuisses"), (r"calf press", "Mollets à la presse"),
 (r"(shoulder|military|overhead) press", "Développé épaules"), (r"chest press", "Développé pectoraux"), (r"floor press", "Développé au sol"),
 (r"push ?press", "Push press"), (r"arnold", "Développé Arnold"), (r"jm press", "JM press"),
 (r"(lat )?pull ?downs?", "Tirage vertical"), (r"pull ?ups?|pullups?", "Tractions"), (r"chin ?ups?|chins", "Tractions en supination"),
 (r"push ?ups?|pushups?", "Pompes"), (r"sit ?ups?", "Sit-up"), (r"romanian deadlift", "Soulevé de terre roumain"),
 (r"stiff legged deadlift", "Soulevé de terre jambes tendues"), (r"sumo deadlift", "Soulevé de terre sumo"), (r"deadlifts?", "Soulevé de terre"),
 (r"good mornings?", "Good morning"), (r"front squats?", "Squat avant"), (r"split squats?", "Split squat"), (r"hack squats?", "Hack squat"),
 (r"goblet squats?", "Goblet squat"), (r"pistol squat", "Pistol squat"), (r"squats?", "Squat"), (r"lunges?", "Fentes"),
 (r"step ?ups?", "Step-up"), (r"hammer curls?", "Curl marteau"), (r"preacher curls?", "Curl au pupitre"), (r"concentration curls?", "Curl concentré"),
 (r"wrist curls?", "Curl poignets"), (r"leg curls?|hamstring curls?", "Leg curl"), (r"zottman curl", "Curl Zottman"), (r"drag curl", "Drag curl"),
 (r"(biceps? |bicep )?curls?", "Curl"), (r"skull ?crushers?", "Barre au front"), (r"pushdowns?", "Extension triceps à la poulie"),
 (r"kickbacks?", "Kickback"), (r"triceps? extensions?|tricep extensions?", "Extension triceps"), (r"triceps? press", "Développé triceps"),
 (r"dips?", "Dips"), (r"side lateral raises?|lateral raises?|laterals", "Élévations latérales"), (r"front raises?", "Élévations frontales"),
 (r"rear delt (raises?|rows?|fly(es)?)|reverse fly(es)?|reverse flye", "Oiseau"), (r"calf raises?", "Mollets"), (r"leg raises?|knee raises?", "Relevé de jambes"),
 (r"raises?", "Élévation"), (r"cross ?overs?", "Écarté vis-à-vis"), (r"fly(es)?|flyes|flye", "Écarté"), (r"pullovers?", "Pull-over"),
 (r"upright rows?", "Rowing menton"), (r"face pulls?", "Face pull"), (r"rows?", "Rowing"), (r"shrugs?", "Shrugs"),
 (r"crunch(es)?", "Crunch"), (r"planks?", "Planche"), (r"hip thrusts?", "Hip thrust"), (r"(glute )?bridges?", "Pont fessier"),
 (r"hyperextensions?|back extensions?", "Extension lombaire"), (r"leg extensions?", "Leg extension"), (r"extensions?", "Extension"),
 (r"power cleans?", "Épaulé en puissance"), (r"hang cleans?", "Épaulé depuis la suspension"), (r"cleans?", "Épaulé"),
 (r"power snatch", "Arraché en puissance"), (r"snatch", "Arraché"), (r"jerk", "Jeté"), (r"thrusters?", "Thruster"),
 (r"swings?", "Swing"), (r"twists?", "Rotation du buste"), (r"rollouts?", "Roue abdominale"), (r"jumps?", "Saut"), (r"hops?", "Sauts"),
 (r"walk", "Marche"), (r"carry", "Porté"), (r"presses|press", "Développé"), (r"windmills?", "Windmill"), (r"rotations?", "Rotation"),
 (r"adductions?", "Adduction"), (r"abductions?", "Abduction"), (r"throws?", "Lancer"), (r"slams?", "Slam"),
]
MODS = [
 (r"incline", "incliné"), (r"decline", "décliné"), (r"seated", "assis"), (r"standing", "debout"), (r"lying|supine", "allongé"),
 (r"kneeling", "à genoux"), (r"(one|single) arm|one-arm", "à un bras"), (r"(one|single) leg(ged)?", "à une jambe"),
 (r"alternat(e|ing)", "alterné"), (r"close grip|narrow grip", "prise serrée"), (r"wide grip", "prise large"),
 (r"reverse grip|underhand", "prise inversée"), (r"neutral grip|palms in", "prise neutre"), (r"behind the (neck|head)", "derrière la nuque"),
 (r"overhead", "au-dessus de la tête"), (r"bent over", "buste penché"), (r"hanging", "suspendu"), (r"weighted", "lesté"),
 (r"rope", "à la corde"), (r"v bar", "poignée V"), (r"rear", "arrière"), (r"reverse", "inversé"), (r"isometric", "isométrique"),
 (r"smith", "à la Smith machine"), (r"landmine", "landmine"), (r"band(s)?", "avec élastique"), (r"ez bar|e z bar|ez", "barre EZ"),
]

def slug(s): return re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_")
def norm(s): return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")

def french(name, equip):
    if name in MANUAL: return MANUAL[name], True
    low = " " + re.sub(r"[-_/(),]", " ", name.lower()) + " "
    low = re.sub(r"\s+", " ", low)
    core = None
    for pat, fr in CORE:
        m = re.search(r" (" + pat + r") ", low)
        if m: core = fr; low = low.replace(m.group(0), " ", 1); break
    if not core: return name, False
    mods = []
    for pat, fr in MODS:
        m = re.search(r" (" + pat + r") ", low)
        if m and fr not in mods: mods.append(fr); low = low.replace(m.group(0), " ", 1)
    eq = None
    if "dumbbell" in name.lower(): eq = "haltère" if "à un bras" in mods else "haltères"
    elif "barbell" in name.lower(): eq = "barre"
    elif "kettlebell" in name.lower(): eq = "kettlebell"
    elif "cable" in name.lower() or "pulley" in name.lower(): eq = "à la poulie"
    elif "machine" in name.lower() or "leverage" in name.lower(): eq = "à la machine" if "à la Smith machine" not in mods else None
    out = core + (" " + eq if eq and eq not in core else "") + ("".join(" " + m for m in mods))
    return out[0].upper() + out[1:], True

def main():
    data = json.load(open(os.path.join(SRC, "dist", "exercises.json")))
    os.makedirs(os.path.join(OUT, "img", "lib"), exist_ok=True)
    lib, auto, manual, eng = [], 0, 0, 0
    for x in data:
        if x["category"] == "stretching" or not x.get("images"): continue
        fr, okk = french(x["name"], x.get("equipment"))
        if x["name"] in MANUAL: manual += 1
        elif okk: auto += 1
        else: eng += 1
        P = sorted({k for m in x["primaryMuscles"] for k in MUSC.get(m, [])})
        S = sorted({k for m in x["secondaryMuscles"] for k in MUSC.get(m, [])} - set(P))
        folder = x["images"][0].split("/")[0]
        eid = "lib-" + slug(x["id"])
        thumb = os.path.join(OUT, "img", "lib", eid + ".jpg")
        if not os.path.exists(thumb):
            im = Image.open(os.path.join(SRC, "exercises", x["images"][0])).convert("L")
            im = ImageEnhance.Contrast(ImageOps.autocontrast(im, cutoff=1)).enhance(1.1)
            im = ImageOps.fit(im, (240, 160)); im.save(thumb, quality=62, optimize=True, progressive=True)
        lib.append({"id": eid, "fr": fr, "en": x["name"], "eq": EQUIP.get(x.get("equipment"), "autre"), "cat": CAT.get(x["category"], x["category"]),
                    "P": P, "S": S, "f": folder, "n": len(x["images"]), "t": "time" if x.get("force") == "static" else "reps",
                    "lvl": x.get("level"), "ins": x.get("instructions", []), "q": norm(fr + " " + x["name"]), "m": 1 if x["name"] in MANUAL else 0})
    lib.sort(key=lambda e: norm(e["fr"]))
    doc = {"source": "free-exercise-db (domaine public, Unlicense)", "imgBase": f"https://raw.githubusercontent.com/yuhonas/free-exercise-db/{COMMIT}/exercises/", "exercises": lib}
    json.dump(doc, open(os.path.join(OUT, "library.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print(len(lib), "exercices ·", manual, "noms manuels ·", auto, "traduits automatiquement ·", eng, "restés en anglais")

main()
