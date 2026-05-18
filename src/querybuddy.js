#!/usr/bin/env node
/**
 * querybuddy — Natural language to SQL query converter for developers
 * Usage: node src/querybuddy.js <command> [options]
 */

const readline = require('readline');
const fs = require('fs');

// Pattern-based NL→SQL engine (no external deps)
const PATTERNS = [
  // SELECT patterns
  { re: /show (?:me )?(?:all )?(\w+)/i, fn: (m) => `SELECT * FROM ${m[1]};` },
  { re: /get (?:all )?(\w+) (?:where|with) (.+)/i, fn: (m) => buildSelect(m[1], m[2]) },
  { re: /find (?:all )?(\w+) (?:where|with) (.+)/i, fn: (m) => buildSelect(m[1], m[2]) },
  { re: /list (?:all )?(\w+)/i, fn: (m) => `SELECT * FROM ${m[1]};` },
  { re: /count (?:all )?(\w+)/i, fn: (m) => `SELECT COUNT(*) FROM ${m[1]};` },
  { re: /count (\w+) (?:where|with) (.+)/i, fn: (m) => `SELECT COUNT(*) FROM ${m[1]} WHERE ${parseCondition(m[2])};` },
  { re: /(?:how many|how much) (\w+)/i, fn: (m) => `SELECT COUNT(*) FROM ${m[1]};` },
  { re: /sum of (\w+) (?:in|from) (\w+)/i, fn: (m) => `SELECT SUM(${m[1]}) FROM ${m[2]};` },
  { re: /average (\w+) (?:in|from) (\w+)/i, fn: (m) => `SELECT AVG(${m[1]}) FROM ${m[2]};` },
  { re: /max(?:imum)? (\w+) (?:in|from) (\w+)/i, fn: (m) => `SELECT MAX(${m[1]}) FROM ${m[2]};` },
  { re: /min(?:imum)? (\w+) (?:in|from) (\w+)/i, fn: (m) => `SELECT MIN(${m[1]}) FROM ${m[2]};` },
  { re: /top (\d+) (\w+) by (\w+)/i, fn: (m) => `SELECT * FROM ${m[2]} ORDER BY ${m[3]} DESC LIMIT ${m[1]};` },
  { re: /(\w+) ordered by (\w+)(?: desc(?:ending)?)?/i, fn: (m) => `SELECT * FROM ${m[1]} ORDER BY ${m[2]} DESC;` },
  { re: /(\w+) ordered by (\w+) asc(?:ending)?/i, fn: (m) => `SELECT * FROM ${m[1]} ORDER BY ${m[2]} ASC;` },
  { re: /join (\w+) (?:and|with) (\w+) on (\w+)/i, fn: (m) => `SELECT * FROM ${m[1]} JOIN ${m[2]} ON ${m[1]}.${m[3]} = ${m[2]}.${m[3]};` },
  { re: /delete (\w+) (?:where|with) (.+)/i, fn: (m) => `DELETE FROM ${m[1]} WHERE ${parseCondition(m[2])};` },
  { re: /update (\w+) set (.+) (?:where|with) (.+)/i, fn: (m) => `UPDATE ${m[1]} SET ${m[2]} WHERE ${parseCondition(m[3])};` },
  { re: /insert (?:into )?(\w+) values? (.+)/i, fn: (m) => `INSERT INTO ${m[1]} VALUES (${m[2]});` },
  { re: /group (\w+) by (\w+)/i, fn: (m) => `SELECT ${m[2]}, COUNT(*) FROM ${m[1]} GROUP BY ${m[2]};` },
  { re: /(\w+) (?:from|in) (\w+) (?:between|from) (\S+) (?:and|to) (\S+)/i, fn: (m) => `SELECT * FROM ${m[2]} WHERE ${m[1]} BETWEEN ${m[3]} AND ${m[4]};` },
];

function parseCondition(cond) {
  cond = cond.trim();
  // "name is John" → name = 'John'
  cond = cond.replace(/(\w+)\s+is\s+(['"]?)(\w+)\2/gi, "$1 = '$3'");
  // "age equals 30" → age = 30
  cond = cond.replace(/(\w+)\s+equals?\s+(\d+)/gi, '$1 = $2');
  // "age greater than 30" → age > 30
  cond = cond.replace(/(\w+)\s+(?:greater than|more than|above)\s+(\d+)/gi, '$1 > $2');
  // "age less than 30" → age < 30
  cond = cond.replace(/(\w+)\s+(?:less than|below|under)\s+(\d+)/gi, '$1 < $2');
  // "name contains John" → name LIKE '%John%'
  cond = cond.replace(/(\w+)\s+contains?\s+(\w+)/gi, "$1 LIKE '%$2%'");
  // "name starts with J" → name LIKE 'J%'
  cond = cond.replace(/(\w+)\s+starts? with\s+(\w+)/gi, "$1 LIKE '$2%'");
  // "name not null" → name IS NOT NULL
  cond = cond.replace(/(\w+)\s+(?:is )?not null/gi, '$1 IS NOT NULL');
  // and/or
  cond = cond.replace(/\band\b/gi, 'AND').replace(/\bor\b/gi, 'OR');
  return cond;
}

function buildSelect(table, condStr) {
  return `SELECT * FROM ${table} WHERE ${parseCondition(condStr)};`;
}

function translate(nl) {
  const trimmed = nl.trim();
  for (const p of PATTERNS) {
    const m = trimmed.match(p.re);
    if (m) return { sql: p.fn(m), confidence: 'high', input: trimmed };
  }
  // Fallback: guess table name and build basic query
  const words = trimmed.toLowerCase().split(/\s+/);
  const tableWord = words.find(w => w.length > 3 && !['show','find','list','get','all','the','from'].includes(w));
  if (tableWord) {
    return { sql: `SELECT * FROM ${tableWord}; -- (low confidence, review before use)`, confidence: 'low', input: trimmed };
  }
  return { sql: null, confidence: 'none', input: trimmed };
}

function translateCommand(query) {
  const result = translate(query);
  console.log(`\n🧙 QueryBuddy`);
  console.log(`Input:       ${result.input}`);
  if (result.sql) {
    console.log(`SQL:         ${result.sql}`);
    console.log(`Confidence:  ${result.confidence === 'high' ? '🟢 High' : '🟡 Low — verify before running'}`);
  } else {
    console.log('❌ Could not translate. Try: "show users", "find orders where status is active", "count products"');
  }
}

function interactiveCommand() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n🧙 QueryBuddy — Interactive Mode');
  console.log('Type natural language queries, or "exit" to quit.\n');
  const prompt = () => {
    rl.question('> ', (line) => {
      if (line.toLowerCase() === 'exit') { console.log('Bye! 👋'); rl.close(); return; }
      translateCommand(line);
      console.log('');
      prompt();
    });
  };
  prompt();
}

function batchCommand(filePath) {
  if (!fs.existsSync(filePath)) { console.error(`❌ File not found: ${filePath}`); process.exit(1); }
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  console.log(`\n🧙 QueryBuddy — Batch Mode (${lines.length} queries)\n`);
  const results = lines.map(q => ({ ...translate(q), original: q }));
  results.forEach((r, i) => {
    console.log(`[${i+1}] ${r.input}`);
    console.log(`     → ${r.sql || 'COULD NOT TRANSLATE'}`);
    if (r.confidence === 'low') console.log(`       ⚠️  Low confidence`);
  });
  const sqlOut = results.filter(r => r.sql).map(r => `-- ${r.input}\n${r.sql}`).join('\n\n');
  const outFile = filePath.replace(/\.[^.]+$/, '') + '.sql';
  fs.writeFileSync(outFile, sqlOut);
  console.log(`\n✅ SQL written to ${outFile}`);
}

function examplesCommand() {
  const examples = [
    ['show users', 'SELECT * FROM users;'],
    ['find orders where status is active', "SELECT * FROM orders WHERE status = 'active';"],
    ['count products', 'SELECT COUNT(*) FROM products;'],
    ['top 10 users by score', 'SELECT * FROM users ORDER BY score DESC LIMIT 10;'],
    ['sum of price from orders', 'SELECT SUM(price) FROM orders;'],
    ['group orders by status', 'SELECT status, COUNT(*) FROM orders GROUP BY status;'],
    ['delete users where age less than 18', 'DELETE FROM users WHERE age < 18;'],
  ];
  console.log('\n📚 QueryBuddy — Example Translations:\n');
  examples.forEach(([nl, sql]) => {
    console.log(`  NL:  ${nl}`);
    console.log(`  SQL: ${sql}\n`);
  });
}

const [,, cmd, ...args] = process.argv;
if (!cmd || cmd === 'help') {
  console.log('querybuddy — Natural Language to SQL Converter\n');
  console.log('Commands:');
  console.log('  translate "<query>"         Convert NL to SQL');
  console.log('  interactive                 Start interactive REPL mode');
  console.log('  batch <queries.txt>         Translate a file of queries');
  console.log('  examples                    Show example translations');
  process.exit(0);
}

if (cmd === 'translate') translateCommand(args.join(' '));
else if (cmd === 'interactive') interactiveCommand();
else if (cmd === 'batch') batchCommand(args[0]);
else if (cmd === 'examples') examplesCommand();
else { console.error(`Unknown command: ${cmd}`); process.exit(1); }
