from pathlib import Path
import re,json,hashlib,html as html_lib
root=Path(__file__).resolve().parents[1]
read=lambda name:(root/name).read_text(encoding='utf8')
def version_assets(document, revision='scene1'):
 return re.sub(r'((?:src|href)="[^"?#]+\.(?:css|mjs|js|html))(\?[^"#]*)?"',lambda m:m[1]+(m[2]+'&amp;' if m[2] else '?')+'v='+revision+'"',document)
template=read('single-template.html')
(root/'single.html').write_text(version_assets(template,'legibility1'),encoding='utf8')
data={f'data/{n}':json.loads(read('data/'+n)) for n in ['posts.json','posts.ko.json','source-defaults.json','twitter-2023-defaults.json','provenance.json']}
exports='HEADS,NEG,CONT,DEFAULT_OPTIONS,validateWeights,rank,simulate'
xengine=read('engine.mjs').replace('export ','')
tengine=re.sub(r'^import .*?;\n','',read('twitter-engine.mjs'),count=1).replace('export ','')
bundles='const xBundle=(()=>{'+xengine+';return {'+exports+',seedOf,diversityMultiplier};})();\n'
bundles+='const tBundle=(()=>{const {simulate:commonSimulate,seedOf,diversityMultiplier}=xBundle;'+tengine+';return {'+exports+'};})();\n'
app=read('translations.mjs').replace('export ','')+'\n'+re.sub(r'^import .*?;\n','',read('app.mjs'),flags=re.M)
app=app.replace("const load=async url=>{const r=await fetch(url);if(!r.ok)throw Error(`${url} (${r.status})`);return r.json();};",'const load=async url=>embeddedData[url];')
children={}
for year in ['2023','2026']:
 init=f"const ERA='{year}',DEFAULTS_PATH='data/{'twitter-2023-defaults' if year=='2023' else 'source-defaults'}.json';const {{{exports}}}={'tBundle' if year=='2023' else 'xBundle'};"
 script='const embeddedData='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n'+bundles+init+'\n'+app
 script=script.replace('</script','<\\/script')
 child=template.replace('<link rel="stylesheet" href="style.css">','<style>'+read('style.css')+'</style>').replace('<script type="module" src="app.mjs"></script>','<script type="module">'+script+'</script>')
 child=child.replace('<link rel="stylesheet" href="device-ui.css">','<style>'+read('device-ui.css')+'</style>')
 children[year]=child
compare=read('compare.html');(root/'classic.html').write_text(version_assets(compare),encoding='utf8')
compare=compare.replace('<link rel="stylesheet" href="compare.css">','<style>'+read('compare.css')+'</style>').replace('<script src="compare.mjs" type="module"></script>','<script type="module">'+read('compare.mjs')+'</script>')
for year,child in children.items():compare=compare.replace(f'src="single.html?year={year}"','srcdoc="'+html_lib.escape(child,quote=True)+'"')
(root/'비교앱.html').write_text(compare,encoding='utf8')
stage=read('stage-template.html');(root/'index.html').write_text(version_assets(stage,'legibility1'),encoding='utf8')
stage=stage.replace('<link rel="stylesheet" href="stage.css">','<style>'+read('stage.css')+'</style>').replace('<script src="compare.mjs" type="module"></script>','<script type="module">'+read('compare.mjs')+'</script>').replace('<script src="phone-stage.bundle.js"></script>','<script>'+read('phone-stage.bundle.js').replace('</script','<\\/script')+'</script>')
stage=stage.replace('<script src="presentation-cache.js"></script>','<script>'+read('presentation-cache.js')+'</script>')
for year,child in children.items():
 child=child.replace('const embeddedData=','window.__PHONE_SKIN__=true;const embeddedData=')
 stage=stage.replace(f'src="single.html?year={year}&amp;device=1"','srcdoc="'+html_lib.escape(child,quote=True)+'"')
(root/'체험앱.html').write_text(stage,encoding='utf8')
print('3D standalone built:',len(stage.encode('utf8')),'bytes; classic:',len(compare.encode('utf8')))

files=['index.html','single.html','classic.html','stage.css','style.css','device-ui.css','compare.css','compare.mjs','app.mjs','active-engine.mjs','engine.mjs','twitter-engine.mjs','translations.mjs','phone-stage.bundle.js','presentation-cache.js','data/posts.json','data/posts.ko.json','data/source-defaults.json','data/twitter-2023-defaults.json','data/provenance.json']
revision=hashlib.sha256(b''.join((root/f).read_bytes() for f in files)).hexdigest()[:16]
(root/'sw.js').write_text(read('sw-template.js').replace('__REVISION__',revision).replace('__FILES__',json.dumps(files)),encoding='utf8')
print('Presentation cache:',revision,len(files),'files')
