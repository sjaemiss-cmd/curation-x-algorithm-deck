from pathlib import Path
import re,json,html as html_lib
root=Path(__file__).resolve().parents[1]
read=lambda name:(root/name).read_text(encoding='utf8')
template=read('single-template.html')
(root/'single.html').write_text(template,encoding='utf8')
data={f'data/{n}':json.loads(read('data/'+n)) for n in ['posts.json','source-defaults.json','twitter-2023-defaults.json','provenance.json']}
exports='HEADS,NEG,CONT,DEFAULT_OPTIONS,validateWeights,rank,simulate'
xengine=read('engine.mjs').replace('export ','')
tengine=re.sub(r'^import .*?;\n','',read('twitter-engine.mjs'),count=1).replace('export ','')
bundles='const xBundle=(()=>{'+xengine+';return {'+exports+',seedOf,diversityMultiplier};})();\n'
bundles+='const tBundle=(()=>{const {simulate:commonSimulate,seedOf,diversityMultiplier}=xBundle;'+tengine+';return {'+exports+'};})();\n'
app=re.sub(r'^import .*?;\n','',read('app.mjs'),count=1)
app=app.replace("const load=async url=>{const r=await fetch(url);if(!r.ok)throw Error(`${url} (${r.status})`);return r.json();};",'const load=async url=>embeddedData[url];')
children={}
for year in ['2023','2026']:
 init=f"const ERA='{year}',DEFAULTS_PATH='data/{'twitter-2023-defaults' if year=='2023' else 'source-defaults'}.json';const {{{exports}}}={'tBundle' if year=='2023' else 'xBundle'};"
 script='const embeddedData='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n'+bundles+init+'\n'+app
 script=script.replace('</script','<\\/script')
 child=template.replace('<link rel="stylesheet" href="style.css">','<style>'+read('style.css')+'</style>').replace('<script type="module" src="app.mjs"></script>','<script type="module">'+script+'</script>')
 children[year]=child
compare=read('compare.html');(root/'index.html').write_text(compare,encoding='utf8')
compare=compare.replace('<link rel="stylesheet" href="compare.css">','<style>'+read('compare.css')+'</style>').replace('<script src="compare.mjs" type="module"></script>','<script type="module">'+read('compare.mjs')+'</script>')
for year,child in children.items():compare=compare.replace(f'src="single.html?year={year}"','srcdoc="'+html_lib.escape(child,quote=True)+'"')
(root/'체험앱.html').write_text(compare,encoding='utf8')
print('Two-era standalone built:',len(compare.encode('utf8')),'bytes')
