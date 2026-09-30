import assert from 'node:assert/strict';
import materials from '../app/learning-materials.json' with { type: 'json' };
import curriculum from '../app/curriculum.json' with { type: 'json' };
const ids=new Set();
for(const tab of materials.tabs){
 assert(!ids.has(tab.id));ids.add(tab.id);
 assert(tab.months.every(m=>Number.isInteger(m)&&m>=1&&m<=12));
 for(const variant of tab.variants)for(const section of variant.sections){
  assert.equal(section.counts.length,section.notes.length,`${tab.id}: counts must align with attacks`);
  assert.equal(section.fingers.length,section.notes.length,`${tab.id}: fingers must align with attacks`);
  assert(section.barsAfter.every(i=>Number.isInteger(i)&&i>=0&&i<section.notes.length));
  for(const notes of section.notes)for(const [string,fret] of Object.entries(notes)){
   assert(/^[1-6]$/.test(string));assert(/^(?:\d{1,2}|x|<\d{1,2}>)$/.test(fret));
   if(/^\d+$/.test(fret))assert(Number(fret)<=24);
  }
 }
}
const tuning={1:64,2:59,3:55,4:50,5:45,6:40};
const birthday=materials.tabs.find(t=>t.id==='birthday-melody');
const melody=birthday.variants[0].sections.flatMap(s=>s.notes).map(n=>{const [[string,fret]]=Object.entries(n);return tuning[string]+Number(fret);});
assert.deepEqual(melody,[55,55,57,55,60,59,55,55,57,55,62,60,55,55,67,64,60,59,57,65,65,64,60,62,60],'Happy Birthday must preserve the recognisable melody in C');
const songIds=new Set(materials.songs.map(s=>s.id));
assert(curriculum.practicePieces.every(p=>songIds.has(p.id)),'Every repertoire piece needs material links');
for(const song of materials.songs){assert(['https:','http:'].includes(new URL(song.scoreUrl).protocol));assert(song.scoreAccess.length>0);}
for(const video of [...materials.videos,...materials.songs.map(s=>s.video).filter(Boolean)]){
 assert(/^[\w-]{11}$/.test(video.id));assert(video.teacher&&video.sourceUrl&&video.kind);assert(video.verifiedOn);
}
console.log(`Learning materials passed: ${materials.tabs.length} TAB examples, melody pitches, aligned counts/fingers, all repertoire links and video metadata.`);
