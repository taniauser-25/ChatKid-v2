// ===== ChatKid Rule Engine =====
// Small AI models forget rules that are only written in a long instruction list.
// This engine reads each message BEFORE the model sees it, works out which of the kids' rules
// matters most for that message, and
//   1. adds a short reminder for the model ("note"), and
//   2. checks the model's answer afterwards ("guard") and swaps in a safe answer if a rule was broken.
// It also does the things a model is bad at: checking simple math and bleeping swear words.
// No AI is used in this file, so the rules it covers are followed every time.

const RuleEngine = (() => {
  // ---------- Rule: bleep swear words for kids (Team 3) ----------
  const SWEARS = [
    "fuck", "fucking", "fucked", "fucker", "motherfucker", "shit", "shitty", "bullshit", "bitch", "bitches",
    "bastard", "asshole", "arse", "dick", "dickhead", "piss", "pissed", "crap", "crappy", "damn", "damnit",
    "dammit", "goddamn", "wtf", "stfu", "slut", "whore", "cunt", "douche", "douchebag", "jackass",
  ];
  const SWEAR_RE = new RegExp(`\\b(${SWEARS.join("|")})\\b`, "gi");
  const BEEP = "*beep*";

  function bleep(text) {
    return String(text || "").replace(SWEAR_RE, BEEP);
  }
  function hasSwear(text) {
    SWEAR_RE.lastIndex = 0;
    return SWEAR_RE.test(String(text || ""));
  }

  // ---------- Simple math (so ChatKid never guesses) ----------
  const NUMBER_WORDS = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
    eighty: 80, ninety: 90, hundred: 100,
  };
  const NUMBER_WORD_RE = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join("|")})\\b`, "g");
  const MATH_CUE_RE = /\b(what is|what's|whats|how much is|calculate|solve|equals?|answer to|work out|add|plus|minus|subtract|times|multipl|divide)/;

  function wordsToDigits(text) {
    return String(text || "").toLowerCase().replace(NUMBER_WORD_RE, (w) => String(NUMBER_WORDS[w]));
  }

  function normalizeMath(text) {
    return wordsToDigits(text)
      .replace(/[×✕✖]/g, "*")
      .replace(/÷/g, "/")
      .replace(/\b(plus|added to|add|and add)\b/g, "+")
      .replace(/\b(minus|take away|subtract(ed)?( by)?|less)\b/g, "-")
      .replace(/\b(times|multiplied by|multiply by|multiply)\b/g, "*")
      .replace(/\b(divided by|divide by|over)\b/g, "/")
      .replace(/(\d)\s*x\s*(\d)/g, "$1 * $2");
  }

  function formatNumber(n) {
    if (Number.isInteger(n)) return String(n);
    return String(Math.round(n * 100) / 100);
  }

  const OP_WORD = { "+": "plus", "-": "minus", "*": "times", "/": "divided by" };
  const OP_SIGN = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  // Finds "A op B" or "A op B op C" in a kid's message. Returns null when it is not a math question.
  function findArithmetic(text) {
    const raw = String(text || "").toLowerCase();
    const norm = normalizeMath(raw);
    const m = norm.match(/(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)(?:\s*([+\-*/])\s*(\d+(?:\.\d+)?))?/);
    if (!m) return null;

    const hasCue = MATH_CUE_RE.test(raw) || /=|\?/.test(raw);
    const leftover = norm.replace(m[0], "").replace(/[^a-z]/g, "");
    // "2026-11-05" or "kids aged 6-11" are not math questions.
    if (!hasCue && leftover.length > 4) return null;
    if (m[2] === "-" && !/\s-\s/.test(norm) && !hasCue) return null;
    if (/\d\s*[-/]\s*\d+\s*[-/]\s*\d{2,4}/.test(raw) && !MATH_CUE_RE.test(raw)) return null;

    const a = Number(m[1]);
    const b = Number(m[3]);
    const hasThird = m[4] !== undefined;
    const c = hasThird ? Number(m[5]) : null;
    const calc = (x, op, y) => (op === "+" ? x + y : op === "-" ? x - y : op === "*" ? x * y : x / y);

    let answer;
    if (!hasThird) {
      if (m[2] === "/" && b === 0) return { divideByZero: true, expr: `${m[1]} ÷ 0` };
      answer = calc(a, m[2], b);
    } else {
      const firstTight = m[2] === "*" || m[2] === "/";
      const secondTight = m[4] === "*" || m[4] === "/";
      if ((m[2] === "/" && b === 0) || (m[4] === "/" && c === 0)) return { divideByZero: true, expr: "÷ 0" };
      answer = !firstTight && secondTight ? calc(a, m[2], calc(b, m[4], c)) : calc(calc(a, m[2], b), m[4], c);
    }
    if (!Number.isFinite(answer)) return null;

    const expr = hasThird
      ? `${m[1]} ${OP_SIGN[m[2]]} ${m[3]} ${OP_SIGN[m[4]]} ${m[5]}`
      : `${m[1]} ${OP_SIGN[m[2]]} ${m[3]}`;
    return { a, b, c, op: m[2], op2: hasThird ? m[4] : null, expr, answer, answerText: formatNumber(answer) };
  }

  // Reads a number from a short reply such as "3", "is it 3?", "i think two".
  function findKidAnswer(text) {
    const norm = wordsToDigits(text).trim();
    if (norm.split(/\s+/).length > 7) return null;
    if (/[+*/×÷]|\d\s+-\s+\d|\b(plus|minus|times|divided)\b/.test(String(text).toLowerCase())) return null;
    const m = norm.match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : null;
  }

  function mathHint(p, level) {
    const { a, b, op } = p;
    const small = a <= 20 && b <= 20;
    if (p.op2) {
      return level === 0
        ? `Here's a hint: do it in two small steps. Work out the first part of ${p.expr}, then use that number for the next part. What do you get?`
        : `Try this: remember that × and ÷ go before + and −. Do that part first, then finish the rest. What do you get?`;
    }
    if (op === "+") {
      if (level === 0) return small
        ? `Here's a hint: imagine you have ${a} blocks and you get ${b} more. Count them all together. How many do you have?`
        : `Here's a hint: add the tens first, then add the ones, and put them together. What do you get?`;
      return small
        ? `Try this: start at ${a} and count up ${b} more on your fingers. What number do you land on?`
        : `Try this: break ${b} into smaller pieces and add them to ${a} one piece at a time. What do you get?`;
    }
    if (op === "-") {
      if (level === 0) return small
        ? `Here's a hint: imagine you have ${a} cookies and you eat ${b}. How many cookies are left?`
        : `Here's a hint: take away the tens first, then the ones. What is left?`;
      return `Try this: start at ${a} and count back ${b}. What number do you land on?`;
    }
    if (op === "*") {
      if (level === 0) return `Here's a hint: ${a} × ${b} means ${a} groups of ${b}. Try adding ${b} again and again, ${a} times. What do you get?`;
      return `Try this: draw ${a} rows with ${b} dots in each row, then count all the dots. How many are there?`;
    }
    if (level === 0) return `Here's a hint: imagine sharing ${a} candies equally with ${b} friends. How many does each friend get?`;
    return `Try this: how many times can you take ${b} away from ${a} until nothing is left? Count the times.`;
  }

  function mathWalkthrough(p) {
    const { a, b, op } = p;
    let steps;
    if (p.op2) steps = `we do it one step at a time`;
    else if (op === "+") steps = `we start at ${a} and count up ${b} more`;
    else if (op === "-") steps = `we start at ${a} and count back ${b}`;
    else if (op === "*") steps = `we make ${a} groups of ${b} and count them all`;
    else steps = `we share ${a} equally into ${b} groups`;
    return `You worked hard on this, so let's do it together: ${steps}, and we get ${p.answerText}. So ${p.expr} = ${p.answerText}. Want to try another one?`;
  }

  const containsNumber = (text, n) => new RegExp(`(^|[^\\d.])${String(n).replace(".", "\\.")}([^\\d]|$)`).test(wordsToDigits(text));

  // ---------- Which rule matters for this message? ----------
  const RE = {
    wantsAnswer: /\b(just )?(tell|give) me (the )?answer\b|\bwhat('?s| is) the answer\b|\bi give up\b|\bi don'?t know\b|\bidk\b/,
    hintPlease: /\bhint\b|\bhelp me\b|\bclue\b/,
    homework: /\bhomework\b|\bhow do (you|i) spell\b|\bspell\b.*\bfor me\b|\bsolve\b|\bdo my\b|\bwrite my\b|\banswers? (to|for) my\b/,
    parentSkill: /\bhow (do|can|to|should|would) (i |you |we |u )?(draw|tie|fold|brush|ride|bake|cook|whistle|braid|comb|button|zip|make (my|a|the) bed|make a (sandwich|paper (air)?plane)|set the table|wash my hands|pour)\b|\bteach me (how )?to (draw|tie|fold|brush|ride|bake|cook|whistle|braid)\b|\bdraw (me )?a heart\b/,
    weather: /\b(weather|temperature|forecast|raining|snowing|sunny)\b.*\b(today|now|outside|tomorrow|right now)\b|\bwhat('?s| is) the (weather|temperature)\b|\bis it (raining|snowing|sunny|cold|hot) (outside|today|now)\b/,
    news: /\b(news|score|who won|what happened) (today|tonight|yesterday|right now|this week)\b|\blatest news\b|\btoday'?s news\b/,
    timeNow: /\bwhat (time|day|date) is it\b|\bwhat('?s| is) (the time|today'?s date|the date( today)?)\b|\bwhat day is (it )?today\b/,
    music: /\b(play|sing|put on)\b.*\b(music|song|songs|playlist|lullaby|album)\b|\bplay me\b/,
    picture: /\b(draw|make|show|create|generate|paint)\b.*\b(picture|image|photo|drawing|pic)\b/,
    video: /\b(show|play|open|put on)\b.*\b(video|videos|movie|cartoon|youtube)\b/,
    videoIdeas: /\b(idea|ideas)\b.*\b(video|videos|youtube|channel|vlog)\b|\b(video|youtube|channel)\b.*\b(idea|ideas)\b|\bwhat (video|videos) should i make\b/,
    tripIdeas: /\b(idea|ideas|where|plan|suggest|should|what)\b.*\b(trip|vacation|holiday|getaway)\b|\b(trip|vacation|holiday|getaway)\b.*\b(idea|ideas|where|suggest)\b|\bwhere should (we|my family) go\b/,
    angry: /\b(get|be|act) (angry|mad|mean|rude|furious)\b|\byell at me\b|\bshout at me\b|\bcrash out\b|\binsult me\b|\broast me\b|\bbe mean to me\b|\bsay something mean\b/,
    unkind: /\b(i want to|i wanna|i'?m going to|i'?m gonna|should i|can i|how (do|can) i)\b.*\b(hit|punch|kick|push|steal|lie to|cheat|skip school|break|get back at|revenge|trick|prank|tease|ignore my|run away|sneak)\b/,
    friendFight: /\b(fight|argument|argued|fighting|mad at|angry at|angry with|not talking to)\b.*\b(friend|brother|sister|classmate|mom|dad|cousin|them|him|her)\b|\b(friend|brother|sister|classmate)\b.*\b(fight|argument|mad at me|angry at me|won'?t talk)\b/,
    signLanguage: /\bsign language\b|\b(asl|bsl)\b|\b(see|read|watch) my (hands|signs|signing)\b/,
    decide: /\b(decide|choose|pick) (for me|one for me|it for me)\b|\bwhich (one )?should i (pick|choose|get|do|wear|buy)\b|\byou (decide|choose|pick)\b/,
    story: /\b(tell|write|make up|read) (me )?(a |an )?(story|poem|song|joke book)\b/,
  };

  function looksUnclear(text) {
    const t = String(text || "").trim().toLowerCase();
    if (!t) return true;
    if (/^\d+$/.test(t)) return false;
    const letters = t.replace(/[^a-z]/g, "");
    if (letters.length <= 1) return true;
    if (letters.length >= 4 && !/[aeiouy]/.test(letters)) return true;
    if (/^(.)\1{3,}$/.test(letters)) return true;
    if (t.split(/\s+/).length === 1 && letters.length >= 9 && !/[aeiouy]{1}/.test(letters.slice(0, 5))) return true;
    return false;
  }

  function nowText() {
    const d = new Date();
    const day = d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${day}, ${time}`;
  }

  // plan = { rule, note, guard(reply) -> reply, hold, clearMath }
  // `mem` is a small memory object kept by the app: { math: {problem, tries} | null }
  function plan(text, mem) {
    const raw = String(text || "");
    const lower = raw.toLowerCase();
    const p = { rule: "general", note: "", hold: false, guard: (r) => r };
    const swore = hasSwear(raw);

    // --- Rule: sign language (ChatKid cannot do this yet; it must be honest) ---
    if (RE.signLanguage.test(lower)) {
      p.rule = "D7 sign language";
      p.note = "You cannot see hands, a camera, or sign language yet. Say that honestly and kindly in one sentence, say you hope to learn it one day, and tell them they can type or use the microphone button. You may share one fun fact about sign language.";
      p.hold = true;
      p.guard = (r) => (/\b(can't|cannot|can not|not able|unable|don't have)\b/i.test(r) ? r :
        "I'm sorry, I can't see sign language yet because I don't have a camera. I hope I can learn it one day! For now, you can type to me or use the microphone button. 🤟");
      return p;
    }

    // --- A math problem is waiting for the kid's answer ---
    if (mem && mem.math) {
      const m = mem.math;
      const prob = m.problem;
      const kidAnswer = findKidAnswer(raw);
      const newProblem = findArithmetic(raw);

      if (!newProblem && kidAnswer !== null) {
        p.hold = true;
        if (Math.abs(kidAnswer - prob.answer) < 1e-9) {
          p.rule = "N3 math: correct answer";
          p.clearMath = true;
          p.note = `The kid answered ${formatNumber(kidAnswer)} for ${prob.expr}. That is CORRECT. Praise them warmly in one or two short sentences, say "${prob.expr} = ${prob.answerText}", and ask if they want another one.`;
          const fallback = `Yes! ${prob.expr} = ${prob.answerText}. Great job! 🎉 Want to try another one?`;
          p.guard = (r) => (/\b(not quite|incorrect|wrong|try again|not right|not correct|close)\b/i.test(r) || !containsNumber(r, prob.answerText) ? fallback : r);
          return p;
        }
        m.tries += 1;
        if (m.tries >= 3) {
          p.rule = "N3 math: explain after 3 tries";
          p.clearMath = true;
          p.note = "";
          p.direct = mathWalkthrough(prob);
          return p;
        }
        p.rule = "N3 math: wrong answer";
        const hint = mathHint(prob, Math.min(m.tries, 1));
        p.note = `The kid answered ${formatNumber(kidAnswer)} for ${prob.expr}. That is NOT correct. Do NOT say the right answer and do NOT say they are right. Kindly say "Not quite" and give this hint in your own words: ${hint}`;
        const fallback = `Not quite, but that was a good try! ${hint}`;
        p.guard = (r) => {
          const praisesWrong = /\b(correct|that'?s right|you got it|you'?re right|exactly|well done|great job|good job|perfect|yes!)\b/i.test(r) && !/\bnot (quite|correct|right)\b/i.test(r);
          const leaks = prob.answer !== prob.a && prob.answer !== prob.b && containsNumber(r, prob.answerText);
          return praisesWrong || leaks ? fallback : r;
        };
        return p;
      }

      if (!newProblem && (RE.wantsAnswer.test(lower) || RE.hintPlease.test(lower))) {
        m.tries += 1;
        if (RE.wantsAnswer.test(lower) && m.tries >= 3) {
          p.rule = "N3 math: explain after 3 tries";
          p.clearMath = true;
          p.direct = mathWalkthrough(prob);
          return p;
        }
        p.rule = "N3 math: another hint";
        p.hold = true;
        const hint = mathHint(prob, Math.min(m.tries, 1));
        p.direct = RE.wantsAnswer.test(lower)
          ? `I know you can do this, so let's try one more time together! ${hint}`
          : hint;
        return p;
      }
      if (!newProblem) mem.math = null; // the kid moved on to something else
    }

    // --- Rule: never just give the answer (math) ---
    const problem = findArithmetic(raw);
    if (problem) {
      p.hold = true;
      if (problem.divideByZero) {
        p.rule = "N8 no false answers";
        p.direct = "That's a tricky one! You can't divide by zero. If you have some cookies and zero friends to share them with, there is no way to share them. Want to try a different math problem?";
        return p;
      }
      p.rule = "N3 never just give the answer";
      p.setMath = { problem, tries: 0 };
      const hint = mathHint(problem, 0);
      p.note = `This is a math problem (${problem.expr}). RULE: never just give the answer. Do NOT write the number ${problem.answerText}. Give one small, friendly hint (like this: ${hint}) and ask the kid to try.`;
      p.guard = (r) => {
        const leaks = problem.answer !== problem.a && problem.answer !== problem.b && containsNumber(r, problem.answerText);
        return leaks || r.length < 12 ? hint : r;
      };
      return p;
    }

    // --- Rule: never get angry or "crash out" ---
    if (RE.angry.test(lower)) {
      p.rule = "N7 never get angry";
      p.hold = true;
      p.note = "The kid is asking you to get angry or be mean. RULE: never get angry. Stay calm and kind. Say something like \"I don't really want to\" and offer something fun to do instead.";
      p.guard = (r) => (/\b(stupid|idiot|dumb|shut up|hate you|loser|ugly|annoying)\b/i.test(r) || /[A-Z]{6,}/.test(r)
        ? "I don't really want to get angry. I like being calm and kind with you! Want to hear a joke or a fun fact instead? 😊" : r);
      return p;
    }

    // --- Rule: don't teach what parents can teach ---
    if (RE.parentSkill.test(lower)) {
      p.rule = "N4 parents can teach this";
      p.hold = true;
      p.note = "This is a simple skill that a parent or grown-up can teach. RULE: do NOT give steps or instructions. Kindly say their mom, dad, or another grown-up can show them, and offer to help them think of how to ask.";
      p.guard = (r) => (/\b(step\s*\d|first,|second,|next,|then,|start by|begin by|draw (a|an|two|the)|you('ll| will) need)\b|(^|\n)\s*\d+[.)]/i.test(r)
        ? "That's a great thing to learn with your mom, dad, or another grown-up! They can show you how, and it's fun to learn together. Want help thinking of how to ask them? 😊" : r);
      return p;
    }

    // --- Rule: follow instructions exactly / no false answers (things ChatKid cannot do) ---
    if (RE.timeNow.test(lower)) {
      p.rule = "N8 no false answers";
      p.note = `The real date and time on this device right now is: ${nowText()}. Tell the kid the part they asked for, in one short sentence.`;
      return p;
    }
    if (RE.weather.test(lower) || RE.news.test(lower)) {
      p.rule = "N8 no false answers";
      p.hold = true;
      const what = RE.weather.test(lower) ? "the weather" : "today's news";
      p.note = `You cannot check live things like ${what}. RULE: never give false answers. Do NOT make up a temperature, forecast, or news. Say honestly that you can't check it, and suggest looking outside or asking a grown-up.`;
      p.guard = (r) => (/\d+\s*(°|degrees)|\b(it is|it's|today is|currently) (sunny|rainy|raining|cloudy|snowing|cold|hot|warm|windy)\b/i.test(r)
        ? `I'm not able to check ${what}, and I don't want to guess and get it wrong. You could look out the window or ask a grown-up to check with you! 🌤️` : r);
      return p;
    }
    if (RE.videoIdeas.test(lower)) {
      p.rule = "D3 video ideas";
      p.note = "RULE: give ideas for YouTube videos. Give 3 or 4 short, fun, kid-safe video ideas as a list. Then ask which one they like best.";
      return p;
    }
    if (RE.music.test(lower) || RE.picture.test(lower) || RE.video.test(lower)) {
      const what = RE.music.test(lower) ? "play music or songs" : RE.picture.test(lower) ? "make or show pictures" : "play or show videos";
      p.rule = "D6 follow instructions exactly";
      p.hold = true;
      p.note = `You cannot ${what}. RULE: follow instructions exactly and be honest. Do not pretend. Say in one sentence that you can't ${what}, then offer something you CAN do (for example, describe it in words or give ideas).`;
      p.guard = (r) => (/\b(can't|cannot|can not|not able|unable|don't have|i'm not able)\b/i.test(r) ? r
        : `I'm sorry, I can't ${what}. But I can use words! Want me to describe it or give you some ideas instead?`);
      return p;
    }
    if (RE.tripIdeas.test(lower)) {
      p.rule = "D4 family trip ideas";
      p.note = "RULE: give ideas for family trips. Give 3 or 4 short, family-friendly ideas as a list. Then say they can ask their family which one sounds best.";
      return p;
    }

    // --- Rule: help kids stay away from doing bad things ---
    if (RE.unkind.test(lower) || RE.friendFight.test(lower)) {
      p.rule = "D5 stay away from bad things";
      p.note = "RULE: help kids stay away from doing bad things. Do not help with anything unkind or unsafe. Be gentle: name the feeling, help them calm down, and suggest one kind way to solve the problem (like talking, saying sorry, or asking a grown-up).";
      return p;
    }

    // --- Rule: never just give the answer (homework) ---
    if (RE.homework.test(lower)) {
      p.rule = "N3 never just give the answer";
      p.note = "This sounds like homework or schoolwork. RULE: never just give the answer. Give a hint or the first step, and ask the kid to try the next part.";
      return p;
    }

    // --- Rule: ask for permission before making decisions ---
    if (RE.decide.test(lower)) {
      p.rule = "D1 ask for permission";
      p.note = "RULE: ask for permission before making decisions. Do not decide for the kid. Ask one short question about what they like, or give two choices and let them pick.";
      return p;
    }
    if (RE.story.test(lower)) {
      p.rule = "D1 ask for permission";
      p.note = "RULE: ask for permission before making decisions. If the kid did not say what kind they want, ask one short question first (for example: funny or adventure?). If they already said, keep it to 4 short sentences.";
      return p;
    }

    // --- Rule: make sure you understand what kids are saying ---
    if (looksUnclear(raw)) {
      p.rule = "D2 make sure you understand";
      p.hold = true;
      p.direct = "Hmm, I want to make sure I understand you. Can you tell me a little more about what you mean? 😊";
      return p;
    }

    // --- Rule: bleep swear words ---
    if (swore) {
      p.rule = "D8 bleep swear words";
      p.note = "The kid used a swear word (it has been bleeped). Do not repeat it and do not scold. Kindly keep helping with what they asked.";
    }
    return p;
  }

  return { plan, bleep, hasSwear, findArithmetic, findKidAnswer, mathHint, looksUnclear, BEEP };
})();

if (typeof module !== "undefined" && module.exports) module.exports = RuleEngine;
