# 🧙 querybuddy

[![CI](https://github.com/YOUR_USERNAME/querybuddy/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/querybuddy/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![GitHub Achievements](https://img.shields.io/badge/GitHub-Achievements-blueviolet.svg)](https://github.com/YOUR_USERNAME)

> Natural language to SQL query converter — speak plain English, get SQL back.

## ✨ Features

- 🗣️ Translate natural language to SQL (SELECT, INSERT, UPDATE, DELETE)
- 🔁 Interactive REPL mode for quick experimentation
- 📄 Batch mode — convert a whole file of NL queries at once
- 🔢 Handles conditions: greater than, contains, starts with, between, not null
- 📚 Built-in examples to help you get started

## 🚀 Quick Start

```bash
npm install
node src/querybuddy.js translate "show all users where age greater than 25"
node src/querybuddy.js interactive
```

## 📖 Usage

```bash
node src/querybuddy.js translate "<natural language query>"
node src/querybuddy.js interactive
node src/querybuddy.js batch queries.txt
node src/querybuddy.js examples
```

## 🏆 Achievement Scripts

```bash
bash scripts/setup.sh && bash scripts/unlock-all.sh
```
