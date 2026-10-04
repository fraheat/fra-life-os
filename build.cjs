const fs=require('fs'),path=require('path');
const root=__dirname;
let ts;try{ts=require('typescript')}catch{console.error('Run npm install before rebuilding. The prebuilt dist directory works without installation.');process.exit(1)}
let preact=fs.readFileSync(path.join(root,'vendor/preact.mjs'),'utf8');
preact=preact.replace(/export\{[^}]+\};?\s*$/,'return {render:N,createElement:a,Fragment:y,createRef:h,Component:p};');
const code=['icons.jsx','money-model.js','money-ui.jsx','life-os.jsx','main.jsx'].map(f=>fs.readFileSync(path.join(root,'src',f),'utf8')).join('\n');
const result=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None,jsx:ts.JsxEmit.React},reportDiagnostics:true});
for(const d of result.diagnostics||[]) {console.log(ts.flattenDiagnosticMessageText(d.messageText,'\n'));if(d.category===ts.DiagnosticCategory.Error)process.exitCode=1}
if(process.exitCode)process.exit();
const license=fs.readFileSync(path.join(root,'vendor/LICENSE-preact.txt'),'utf8');
const js='/* '+license+' */\n'+'/* OFF SHIFT · Preact (MIT) · No network runtime dependencies */\nconst Preact=(()=>{'+preact+'})();\nconst React={createElement:Preact.createElement,Fragment:Preact.Fragment};\n'+result.outputText;
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<script type="module" src="/src/main.jsx"></script>','<script src="app.js" defer></script>').replace('</head>','<link rel="stylesheet" href="styles.css"></head>').replace('href="/favicon.svg"','href="favicon.svg"');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/app.js'),js);fs.writeFileSync(path.join(root,'dist/index.html'),html);fs.writeFileSync(path.join(root,'dist/styles.css'),fs.readFileSync(path.join(root,'src/styles.css'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/money.css'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/life-os.css'),'utf8'));fs.copyFileSync(path.join(root,'public/favicon.svg'),path.join(root,'dist/favicon.svg'));
let standalone=html.replace('<script src="app.js" defer></script>','<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script>').replace('<link rel="stylesheet" href="styles.css">','<style>'+fs.readFileSync(path.join(root,'dist/styles.css'),'utf8')+'</style>').replace('href="favicon.svg"','href="data:image/svg+xml,'+encodeURIComponent(fs.readFileSync(path.join(root,'public/favicon.svg'),'utf8'))+'"');
fs.writeFileSync(path.join(root,'OFF-SHIFT.html'),standalone);
console.log('Built OFF SHIFT: '+js.length+' bytes JS. Standalone: '+standalone.length+' bytes.');
