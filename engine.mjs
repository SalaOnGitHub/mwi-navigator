import {COURSES, QUESTIONS, DEFAULT_WEIGHTS} from './data.mjs';
export const VERSION = 1;
export function freshState() {
 return {version:VERSION,lang:'de',view:'home',step:0,answers:{},weights:{...DEFAULT_WEIGHTS},
  context:{graduation:2028,mobility:'dach',experience:'student',completed:[],itba:false,code:'unknown',innovation:false,learning:'yes'},
  compare:[],filter:'all'};
}
export function sanitizeState(raw) {
 const s=freshState();
 if(!raw || raw.version!==VERSION) return s;
 s.lang=raw.lang==='en'?'en':'de';
 s.view=['home','quiz','results','explore','evidence'].includes(raw.view)?raw.view:'home';
 s.step=Number.isInteger(raw.step)?Math.max(0,Math.min(5,raw.step)):0;
 for(const q of QUESTIONS) if(raw.answers?.[q.id]===null || [1,2,3,4,5].includes(raw.answers?.[q.id])) s.answers[q.id]=raw.answers[q.id];
 for(const key of Object.keys(s.weights)) {
  const n=raw.weights?.[key]; if(typeof n==='number'&&Number.isFinite(n)) s.weights[key]=Math.max(0,Math.min(100,n));
 }
 const c=raw.context || {};
 if(Number.isInteger(c.graduation)&&c.graduation>=2026&&c.graduation<=2040) s.context.graduation=c.graduation;
 for(const [k,options] of Object.entries({mobility:['austria','dach','europe','global'],experience:['student','switch','working'],code:['none','basic','confident','unknown'],learning:['yes','some','no']})) if(options.includes(c[k])) s.context[k]=c[k];
 s.context.itba=c.itba===true;s.context.innovation=c.innovation===true;
 s.context.completed=Array.isArray(c.completed)?[...new Set(c.completed.filter(id=>COURSES.some(x=>x.id===id)))]:[];
 s.compare=Array.isArray(raw.compare)?[...new Set(raw.compare.filter(id=>COURSES.some(x=>x.id===id)))].slice(0,3):[];
 s.filter=['all','2A','2B'].includes(raw.filter)?raw.filter:'all';
 return s;
}
export function normalizedWeights(weights) {
 const clean=Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map(k=>[k,Math.max(0,Number(weights[k])||0)]));
 const total=Object.values(clean).reduce((a,b)=>a+b,0);
 if(!total) return {...DEFAULT_WEIGHTS};
 return Object.fromEntries(Object.entries(clean).map(([k,v])=>[k,v*100/total]));
}
export function horizon(context) {return {start:context.graduation+2,end:context.graduation+5};}
export function coverage(until,context) {
 if(until===null) return 'context';
 const h=horizon(context);
 return until<h.start?'outside':until<h.end?'partial':'covered';
}
export function counts(state) {
 return {
 answered:QUESTIONS.filter(q=>Number.isInteger(state.answers[q.id])).length,
 visited:QUESTIONS.filter(q=>q.id in state.answers).length,
 dimensions:Object.fromEntries(['interest','work','career'].map(d=>[d,QUESTIONS.filter(q=>q.dimension===d&&Number.isInteger(state.answers[q.id])).length]))
 };
}
export function isReady(state) {return Object.values(counts(state).dimensions).every(n=>n>0);}
export function courseResult(course,state) {
 const weights=normalizedWeights(state.weights);
 const dimensions={};const contributions=[];
 const relevant=QUESTIONS.filter(q=>q.course===course.id);
 for(const key of ['interest','work','career']) {
  const answered=relevant.filter(q=>q.dimension===key&&Number.isInteger(state.answers[q.id]));
  dimensions[key]=answered.length?answered.reduce((sum,q)=>sum+(state.answers[q.id]-1)*25,0)/answered.length:null;
 }
 const futureCovered=horizon(state.context).end<=2035;
 const ratings=course.market.ratings.filter(x=>Number.isFinite(x));
 dimensions.market=futureCovered && ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length*20:null;
 const hasPersonal=['interest','work','career'].some(k=>dimensions[k]!==null);
 const keys=Object.keys(weights).filter(k=>dimensions[k]!==null && weights[k]>0);
 const totalWeight=keys.reduce((sum,k)=>sum+weights[k],0);
 const score=isReady(state)&&hasPersonal&&totalWeight>0?keys.reduce((sum,k)=>sum+dimensions[k]*weights[k],0)/totalWeight:null;
 for(const key of keys) contributions.push({key,score:dimensions[key],weight:weights[key]*100/totalWeight,points:dimensions[key]*weights[key]/totalWeight});
 contributions.sort((a,b)=>b.points-a.points);
 return {course,score,dimensions,contributions,answered:relevant.filter(q=>Number.isInteger(state.answers[q.id])).length,total:relevant.length,eligible:!state.context.completed.includes(course.id)};
}
export function recommend(state) {
 const results=COURSES.map(c=>courseResult(c,state));
 const ranked={};
 for(const block of ['2A','2B']) ranked[block]=results.filter(r=>r.course.block===block&&r.eligible).sort((a,b)=>(b.score??-1)-(a.score??-1)||COURSES.indexOf(a.course)-COURSES.indexOf(b.course));
 const pairs=[];
 for(const a of results.filter(r=>r.course.block==='2A')) for(const b of results.filter(r=>r.course.block==='2B')) {
  const eligible=a.eligible&&b.eligible;
  pairs.push({id:a.course.id+'-'+b.course.id,a,b,eligible,score:eligible&&a.score!==null&&b.score!==null?(a.score+b.score)/2:null,required:a.course.id==='mobile'&&b.course.id==='visual'});
 }
 pairs.sort((a,b)=>(b.score??-1)-(a.score??-1));
 const conflict=state.context.itba&&['mobile','visual'].some(id=>state.context.completed.includes(id));
 const recommended=state.context.itba?(conflict?null:pairs.find(p=>p.required)):pairs.find(p=>p.eligible&&p.score!==null)||null;
 return {results,ranked,pairs,recommended,conflict,ready:isReady(state)};
}
