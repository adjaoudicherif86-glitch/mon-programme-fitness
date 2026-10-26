"""Construit docs/ciqual.json à partir de la table Ciqual 2025 (Anses, Licence Ouverte / Etalab 2.0).
Valeurs pour 100 g : kcal (règlement UE 1169/2011), protéines, glucides, lipides, fibres."""
import csv, json, os, re, unicodedata
SRC = os.path.join(os.path.dirname(__file__), "CIQUAL2025_FR_2025_11_03.csv")
OUT = os.path.join(os.path.dirname(__file__), "..", "docs", "ciqual.json")
def val(x):
    x = (x or "").strip().replace(",", ".")
    if x in ("", "-"): return None
    if x.lower().startswith("traces"): return 0.0
    x = x.lstrip("<").strip()
    try: return round(float(x), 1)
    except ValueError: return None
def norm(s): return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")
rows = list(csv.reader(open(SRC, encoding="utf-8"), delimiter="\t"))
head = [re.sub(r"\s+", " ", h) for h in rows[0]]
def col(*keys):
    for i, h in enumerate(head):
        if all(k.lower() in h.lower() for k in keys): return i
    raise SystemExit("colonne introuvable: %s" % (keys,))
iC, iN, iG, iSG = col("alim_code"), col("alim_nom_fr"), col("alim_grp_nom_fr"), col("alim_ssgrp_nom_fr")
iK, iP, iGl, iL, iF = col("1169", "kcal"), col("Protéines", "Jones"), col("Glucides"), col("Lipides"), col("Fibres alimentaires")
out = []
for r in rows[1:]:
    if len(r) <= iF: continue
    k = val(r[iK])
    if k is None: continue
    name = r[iN].strip()
    out.append([int(r[iC]), name, r[iSG].strip() or r[iG].strip(), k, val(r[iP]) or 0, val(r[iGl]) or 0, val(r[iL]) or 0, val(r[iF]) or 0])
out.sort(key=lambda x: norm(x[1]))
json.dump({"source": "Table de composition nutritionnelle des aliments Ciqual 2025, Anses (Licence Ouverte Etalab 2.0)",
           "cols": ["code", "nom", "groupe", "kcal", "prot", "gluc", "lip", "fibres"], "foods": out},
          open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "aliments ->", os.path.getsize(OUT) // 1024, "Ko")
