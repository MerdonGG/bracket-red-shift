from pathlib import Path
import base64
d=Path(__file__).resolve().parents[1] / "game"
html=(d/"index.html").read_text(encoding="utf-8-sig")
for name in ["game","scene"]:
 js=(d/(name+".js")).read_text(encoding="utf-8-sig").replace('"bracket.png"','"data:image/png;base64,'+base64.b64encode((d/"bracket.png").read_bytes()).decode()+'"')
 html=html.replace('<script src="'+name+'.js"></script>',"<script>"+js+"</script>")
(d.parent / "Bracket-game.html").write_text(html,encoding="utf-8")
