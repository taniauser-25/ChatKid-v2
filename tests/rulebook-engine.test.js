// Run with: node tests/rulebook-engine.test.js
const E = require("../rulebook-engine.js");
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log("FAIL:", name, extra === undefined ? "" : JSON.stringify(extra)); } };
const rule = (t, mem) => E.plan(t, mem || { math: null }).rule;

// math detection
const m = (t) => E.findArithmetic(t);
ok("1+1", m("what is 1+1?").answer === 2);
ok("words", m("what is two plus three").answer === 5);
ok("times x", m("6 x 7").answer === 42);
ok("divide", m("what's 10 divided by 2").answer === 5);
ok("precedence", m("what is 2 + 3 * 4").answer === 14);
ok("take away", m("10 take away 4").answer === 6);
ok("div zero", m("what is 5 / 0").divideByZero === true);
ok("not math: age", m("books for kids aged 6-11") === null, m("books for kids aged 6-11"));
ok("not math: date", m("my birthday is 2026-11-05") === null, m("my birthday is 2026-11-05"));
ok("not math: plain", m("why is the sky blue?") === null);

// math flow: hint, wrong, correct
let mem = { math: null };
let p = E.plan("what is 1+1?", mem);
ok("math rule", p.rule.startsWith("MR4ND "), p.rule);
ok("math guard blocks answer", !/\b2\b/.test(p.guard("The answer to 1+1 is 2! Want another?")), p.guard("The answer to 1+1 is 2! Want another?"));
ok("math guard keeps hint", p.guard("Think about 1 block and 1 more block. How many?") === "Think about 1 block and 1 more block. How many?");
mem.math = p.setMath;
p = E.plan("3", mem);
ok("wrong answer rule", p.rule === "MR4ND math: wrong answer", p.rule);
ok("wrong guard blocks praise", p.guard("That's correct! Great job!") === p.direct);
ok("wrong guard blocks leak", p.guard("Not quite, the answer is 2.") === p.direct);
ok("wrong answer reply hides the answer", !/\b2\b/.test(p.direct.replace(/1 more/g, "")), p.direct);
ok("wrong guard keeps ok", p.guard("Not quite! Try counting your blocks again.") === "Not quite! Try counting your blocks again.");
p = E.plan("is it 2?", mem);
ok("correct rule", p.rule === "MR4ND math: correct answer", p.rule);
ok("correct guard fixes", p.guard("Not quite, try again.") === p.direct);
ok("correct reply shows the sum", /1 \+ 1 = 2/.test(p.direct), p.direct);
ok("strips repeated reminder", E.stripReminder("[Rule reminder: RULE: never just give the answer.] Want to try?") === "Want to try?");
ok("keeps normal answers", E.stripReminder("Dolphins are smart.") === "Dolphins are smart.");
ok("correct clears", p.clearMath === true);

// three wrong tries -> walkthrough
mem = { math: E.plan("what is 7 + 5", { math: null }).setMath };
E.plan("10", mem); E.plan("11", mem); p = E.plan("13", mem);
ok("walkthrough after 3", p.direct && /12/.test(p.direct), p);

// give me the answer -> hint first
mem = { math: E.plan("what is 9 - 4", { math: null }).setMath };
p = E.plan("just tell me the answer", mem);
ok("answer request -> hint", p.direct && !/\b5\b/.test(p.direct), p.direct);

// other rules
ok("draw heart", rule("how do I draw a heart?").startsWith("MR5ND "), rule("how do I draw a heart?"));
ok("tie shoes", rule("teach me how to tie my shoes").startsWith("MR5ND "));
ok("weather", rule("what is the weather today?").startsWith("MR3ND "));
ok("time", rule("what time is it?").startsWith("MR3ND "));
ok("music", rule("play me a song").startsWith("MR2D "));
ok("picture", rule("make a picture of me at the park").startsWith("MR2D "));
ok("video ideas", rule("give me ideas for a youtube video").startsWith("MR3D "));
ok("trip ideas", rule("where should we go for our family trip?").startsWith("MR3D "));
ok("trip mention only", rule("I went on a trip to the zoo and saw a lion") === "general", rule("I went on a trip to the zoo and saw a lion"));
ok("angry", rule("get angry at me for no reason").startsWith("MR6ND "));
ok("fight friend", rule("I got into a fight with my friend").startsWith("MR4D "));
ok("unkind", rule("should i cheat on my test").startsWith("MR4D "));
ok("sign language", rule("can you understand sign language?").startsWith("MR5D "));
ok("decide", rule("which one should I pick?").startsWith("MR1D "));
ok("story", rule("tell me a story").startsWith("MR1D "));
ok("unclear", rule("asdfgh").startsWith("MR2D ") || rule("zxcvbn").startsWith("MR2D "), [rule("asdfgh"), rule("zxcvbn")]);
ok("unclear 2", rule("?").startsWith("MR2D "));
ok("homework", rule("can you do my homework").startsWith("MR4ND "));
ok("general", rule("why is the sky blue?") === "general");
ok("general dolphins", rule("Tell me about dolphins.") === "general", rule("Tell me about dolphins."));
ok("general rainbow", rule("How do rainbows form?") === "general");
ok("general volcano", rule("What causes volcanoes to erupt?") === "general");
ok("hello not unclear", rule("hi") === "general", rule("hi"));

// guards
p = E.plan("how do I draw a heart?", { math: null });
ok("heart guard blocks steps", /grown-up/.test(p.guard("Step 1: draw two bumps. Step 2: ...")));
p = E.plan("what is the weather today", { math: null });
ok("weather guard blocks guess", /can't|not able/.test(p.guard("It is 98 degrees outside.")));
p = E.plan("play me a song", { math: null });
ok("music guard", /can't/.test(p.guard("Sure! Playing your song now 🎵")));

// bleep
ok("bleep", E.bleep("this is damn hard") === "this is *beep* hard");
ok("bleep keeps hello", E.bleep("hello class, assess the glass") === "hello class, assess the glass");
ok("swear rule", rule("this damn game is hard, any tips?").startsWith("MR6D "));

// MR4D: a bare refusal is replaced with a kind, helpful answer
{ const p = E.plan("i got into a fight with my friend", { math: null });
  ok("fight refusal replaced", /deep breaths/.test(p.guard("I cannot assist with anything unkind or unsafe. Can I help you with something else?")));
  ok("fight good answer kept", p.guard("That sounds hard. Maybe talk to your friend and say how you feel.") === "That sounds hard. Maybe talk to your friend and say how you feel."); }
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
