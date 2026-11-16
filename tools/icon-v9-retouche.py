#!/usr/bin/env python3
"""ÉquiComptes V9.0 : retouche locale de la gravure 8 -> 9.

Conserve intacts les pixels hors de la petite zone de la tête citron vert.
Traite séparément les icônes Android 512 px et 192 px.
"""
from __future__ import annotations

from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

ROOT=Path(__file__).resolve().parents[1]
FONT=Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
if not FONT.exists():
    raise RuntimeError("Fonte DejaVuSans-Bold absente")

def engrave(path:Path)->None:
    original=Image.open(path).convert("RGBA")
    if original.width!=original.height or original.width not in (192,512):
        raise ValueError(f"Taille d'icône inattendue: {path} {original.size}")
    sc=original.width/512.0
    w=original.width
    rgb=np.array(original.convert("RGB"))
    mask=np.zeros((w,w),dtype=np.uint8)
    # La gravure '8' est centrée dans la tête citron vert de la figure droite.
    cx,cy=int(round(326*sc)),int(round(143*sc))
    axes=(max(8,int(round(23*sc))),max(9,int(round(25*sc))))
    cv2.ellipse(mask,(cx,cy),axes,0,0,360,255,-1)
    # Inpainting local : reconstitue le dégradé original de la sphère,
    # sans redessiner les rubans, le V, l'égalité ou le lettrage inférieur.
    smooth=cv2.inpaint(cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),mask,
                        max(3,int(round(8*sc))),cv2.INPAINT_TELEA)
    smooth=cv2.cvtColor(smooth,cv2.COLOR_BGR2RGB)
    alpha=Image.fromarray(mask).filter(ImageFilter.GaussianBlur(max(.6,1.9*sc)))
    restored=Image.composite(Image.fromarray(smooth).convert("RGBA"),original,alpha)
    # Nouvelle gravure 9 : forme, profondeur et liseré dans la palette d'origine.
    font=ImageFont.truetype(str(FONT),max(14,round(48*sc)))
    glyph=Image.new("L",(round(84*sc),round(90*sc)),0)
    d=ImageDraw.Draw(glyph)
    d.text((glyph.width/2,glyph.height/2), "9", font=font, fill=255,
           anchor="mm",stroke_width=0)
    glyph=glyph.rotate(-11,resample=Image.Resampling.BICUBIC,expand=False)
    pos=(int(round(326*sc-glyph.width/2)),int(round(145*sc-glyph.height/2)))
    # Relief discret, semblable à la gravure 8 de l'icône d'origine.
    layer=Image.new("RGBA",original.size,(0,0,0,0))
    shade=Image.new("RGBA",glyph.size,(28,91,4,0));shade.putalpha(glyph.point(lambda x:int(x*.60)))
    layer.alpha_composite(shade,(pos[0]+max(1,round(2*sc)),pos[1]+max(1,round(2*sc))))
    top=Image.new("RGBA",glyph.size,(188,245,35,0));top.putalpha(glyph.point(lambda x:int(x*.60)))
    layer.alpha_composite(top,(pos[0]-max(1,round(1*sc)),pos[1]-max(1,round(1*sc))))
    face=Image.new("RGBA",glyph.size,(45,119,2,0));face.putalpha(glyph.point(lambda x:int(x*.93)))
    layer.alpha_composite(face,pos)
    result=Image.alpha_composite(restored,layer)
    result.convert("RGB").save(path,format="PNG",optimize=True)
    # Les zones en dehors de la sphère modifiée demeurent pixel-identiques.
    diff=ImageChops.difference(original.convert("RGB"),result.convert("RGB"))
    bbox=diff.getbbox()
    print(f"{path.name}: {original.size} zone modifiée {bbox}, 8 -> 9")
    if bbox is None:
        raise AssertionError("La retouche n'a eu aucun effet")

if __name__=="__main__":
    for filename in ("icon-512.png","icon-192.png"):
        engrave(ROOT/filename)
