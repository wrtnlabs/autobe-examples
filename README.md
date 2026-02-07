# AutoBe Generated Examples

## Benchmark

AI Model | Success | Score | FCSR | Status 
:--------|---------|------:|-----:|:------:
[`qwen/qwen3-coder-next`](#qwenqwen3-coder-next) | 0 | 98.17 | 44% | 🟡
[`qwen/qwen3-next-80b-a3b-instruct`](#qwenqwen3-next-80b-a3b-instruct) | 1 | 95.28 | 75% | 🟡
[`qwen/qwen3-30b-a3b-thinking-2507`](#qwenqwen3-30b-a3b-thinking-2507) | 0 | 90.34 | 81% | 🟡
[`deepseek/deepseek-v3.1-terminus-exacto`](#deepseekdeepseek-v31-terminus-exacto) | 0 | 71.86 | 84% | 🟡

- FCSR: Function Calling Success Rate
- Status:
  - 🟢: All projects completed successfully
  - 🟡: Some projects failed
  - ❌: All projects failed or not executed

## `qwen/qwen3-coder-next`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-coder-next/todo/) | 97.27 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`bbs`](./qwen/qwen3-coder-next/bbs/) | 99.08 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`reddit`](./qwen/qwen3-coder-next/reddit/) | 98.08 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./qwen/qwen3-coder-next/shopping/) | 98.26 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

### `qwen/qwen3-coder-next` - `todo`

- Source Code: [`qwen/qwen3-coder-next/todo`](./qwen/qwen3-coder-next/todo/)
- Score: 97.27
- Elapsed Time: 1h 51m 51s
- Token Usage: 46.48M
- Function Calling Success Rate: 31.25%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 760.9K | 8m 55s | 96%
🟢 Database | `namespaces`: 3, `models`: 8 | 2.24M | 6m 4s | 90%
🟢 Interface | `operations`: 20, `schemas`: 25 | 34.31M | 50m 44s | 16%
🟢 Test | `functions`: 42 | 6.64M | 18m 52s | 86%
🟡 Realize | `functions`: 22, `errors`: 1 | 2.54M | 27m 14s | 81%


### `qwen/qwen3-coder-next` - `bbs`

- Source Code: [`qwen/qwen3-coder-next/bbs`](./qwen/qwen3-coder-next/bbs/)
- Score: 99.08
- Elapsed Time: 9h 19m 0s
- Token Usage: 360.78M
- Function Calling Success Rate: 54.56%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 11 | 1.24M | 1h 3m 14s | 76%
🟢 Database | `namespaces`: 8, `models`: 33 | 6.22M | 19m 23s | 82%
🟢 Interface | `operations`: 183, `schemas`: 120 | 226.78M | 3h 49m 55s | 44%
🟢 Test | `functions`: 434 | 99.32M | 1h 47m 23s | 57%
🟡 Realize | `functions`: 196, `errors`: 3 | 27.23M | 2h 19m 3s | 74%


### `qwen/qwen3-coder-next` - `reddit`

- Source Code: [`qwen/qwen3-coder-next/reddit`](./qwen/qwen3-coder-next/reddit/)
- Score: 98.08
- Elapsed Time: 5h 46m 45s
- Token Usage: 264.35M
- Function Calling Success Rate: 44.38%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 13 | 1.48M | 18m 15s | 90%
🟢 Database | `namespaces`: 9, `models`: 30 | 6.21M | 9m 13s | 87%
🟢 Interface | `operations`: 117, `schemas`: 100 | 174.86M | 2h 30m 28s | 29%
🟢 Test | `functions`: 274 | 63.40M | 1h 24m 14s | 59%
🟡 Realize | `functions`: 125, `errors`: 4 | 18.41M | 1h 24m 34s | 74%


### `qwen/qwen3-coder-next` - `shopping`

- Source Code: [`qwen/qwen3-coder-next/shopping`](./qwen/qwen3-coder-next/shopping/)
- Score: 98.26
- Elapsed Time: 13h 18m 4s
- Token Usage: 610.13M
- Function Calling Success Rate: 40.46%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 1.25M | 45m 1s | 90%
🟢 Database | `namespaces`: 9, `models`: 46 | 9.77M | 8m 30s | 83%
🟢 Interface | `operations`: 151, `schemas`: 146 | 472.32M | 9h 48m 3s | 26%
🟢 Test | `functions`: 390 | 100.79M | 1h 16m 12s | 57%
🟡 Realize | `functions`: 172, `errors`: 5 | 25.99M | 1h 20m 15s | 62%


## `qwen/qwen3-next-80b-a3b-instruct`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-next-80b-a3b-instruct/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./qwen/qwen3-next-80b-a3b-instruct/bbs/) | 92.7 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`reddit`](./qwen/qwen3-next-80b-a3b-instruct/reddit/) | 94.91 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./qwen/qwen3-next-80b-a3b-instruct/shopping/) | 93.51 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

### `qwen/qwen3-next-80b-a3b-instruct` - `todo`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/todo`](./qwen/qwen3-next-80b-a3b-instruct/todo/)
- Score: 100
- Elapsed Time: 1h 30m 9s
- Token Usage: 26.11M
- Function Calling Success Rate: 65.38%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 1.20M | 11m 19s | 72%
🟢 Database | `namespaces`: 4, `models`: 8 | 1.72M | 4m 20s | 91%
🟢 Interface | `operations`: 12, `schemas`: 20 | 15.63M | 36m 50s | 62%
🟢 Test | `functions`: 28 | 5.82M | 24m 45s | 52%
🟢 Realize | `functions`: 13 | 1.74M | 12m 53s | 85%


### `qwen/qwen3-next-80b-a3b-instruct` - `bbs`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/bbs`](./qwen/qwen3-next-80b-a3b-instruct/bbs/)
- Score: 92.7
- Elapsed Time: 6h 38m 10s
- Token Usage: 158.44M
- Function Calling Success Rate: 75.46%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 1.52M | 22m 21s | 70%
🟢 Database | `namespaces`: 9, `models`: 32 | 9.98M | 35m 9s | 84%
🟢 Interface | `operations`: 65, `schemas`: 75 | 95.46M | 3h 33m 37s | 69%
🟢 Test | `functions`: 136 | 35.73M | 47m 33s | 87%
🟡 Realize | `functions`: 74, `errors`: 9 | 15.76M | 1h 19m 29s | 69%


### `qwen/qwen3-next-80b-a3b-instruct` - `reddit`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/reddit`](./qwen/qwen3-next-80b-a3b-instruct/reddit/)
- Score: 94.91
- Elapsed Time: 9h 16m 5s
- Token Usage: 318.98M
- Function Calling Success Rate: 75.32%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 1.77M | 26m 25s | 59%
🟢 Database | `namespaces`: 11, `models`: 53 | 9.73M | 28m 34s | 81%
🟢 Interface | `operations`: 184, `schemas`: 160 | 182.45M | 4h 9m 16s | 68%
🟢 Test | `functions`: 383 | 75.54M | 1h 0m 15s | 89%
🟡 Realize | `functions`: 212, `errors`: 18 | 49.49M | 3h 11m 33s | 68%


### `qwen/qwen3-next-80b-a3b-instruct` - `shopping`

- Source Code: [`qwen/qwen3-next-80b-a3b-instruct/shopping`](./qwen/qwen3-next-80b-a3b-instruct/shopping/)
- Score: 93.51
- Elapsed Time: 7h 0m 38s
- Token Usage: 204.39M
- Function Calling Success Rate: 76.33%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 13 | 1.49M | 15m 57s | 68%
🟢 Database | `namespaces`: 12, `models`: 33 | 7.90M | 10m 49s | 85%
🟢 Interface | `operations`: 102, `schemas`: 108 | 121.97M | 3h 35m 59s | 68%
🟢 Test | `functions`: 204 | 44.55M | 56m 56s | 87%
🟡 Realize | `functions`: 111, `errors`: 12 | 28.48M | 2h 0m 56s | 74%


## `qwen/qwen3-30b-a3b-thinking-2507`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-30b-a3b-thinking-2507/todo/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`bbs`](./qwen/qwen3-30b-a3b-thinking-2507/bbs/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`reddit`](./qwen/qwen3-30b-a3b-thinking-2507/reddit/) | 90 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./qwen/qwen3-30b-a3b-thinking-2507/shopping/) | 91.34 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

### `qwen/qwen3-30b-a3b-thinking-2507` - `todo`

- Source Code: [`qwen/qwen3-30b-a3b-thinking-2507/todo`](./qwen/qwen3-30b-a3b-thinking-2507/todo/)
- Score: 90
- Elapsed Time: 3h 20m 45s
- Token Usage: 51.25M
- Function Calling Success Rate: 84.09%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 868.9K | 16m 2s | 100%
🟢 Database | `namespaces`: 4, `models`: 9 | 1.21M | 12m 21s | 88%
🟢 Interface | `operations`: 31, `schemas`: 40 | 26.49M | 1h 5m 45s | 84%
🟢 Test | `functions`: 64 | 13.50M | 33m 2s | 89%
🟡 Realize | `functions`: 50, `errors`: 13 | 9.18M | 1h 13m 33s | 75%


### `qwen/qwen3-30b-a3b-thinking-2507` - `bbs`

- Source Code: [`qwen/qwen3-30b-a3b-thinking-2507/bbs`](./qwen/qwen3-30b-a3b-thinking-2507/bbs/)
- Score: 90
- Elapsed Time: 6h 45m 48s
- Token Usage: 101.63M
- Function Calling Success Rate: 83.95%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 13 | 961.2K | 17m 26s | 96%
🟢 Database | `namespaces`: 6, `models`: 24 | 2.70M | 12m 18s | 91%
🟢 Interface | `operations`: 59, `schemas`: 74 | 46.79M | 2h 7m 51s | 88%
🟢 Test | `functions`: 122 | 25.04M | 1h 24m 14s | 94%
🟡 Realize | `functions`: 90, `errors`: 25 | 26.14M | 2h 43m 57s | 70%


### `qwen/qwen3-30b-a3b-thinking-2507` - `reddit`

- Source Code: [`qwen/qwen3-30b-a3b-thinking-2507/reddit`](./qwen/qwen3-30b-a3b-thinking-2507/reddit/)
- Score: 90
- Elapsed Time: 7h 49m 49s
- Token Usage: 169.23M
- Function Calling Success Rate: 81.65%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 872.7K | 11m 31s | 96%
🟢 Database | `namespaces`: 11, `models`: 30 | 3.79M | 17m 18s | 93%
🟢 Interface | `operations`: 91, `schemas`: 115 | 84.43M | 2h 32m 41s | 83%
🟢 Test | `functions`: 173 | 45.27M | 1h 22m 59s | 90%
🟡 Realize | `functions`: 138, `errors`: 32 | 34.87M | 3h 25m 18s | 69%


### `qwen/qwen3-30b-a3b-thinking-2507` - `shopping`

- Source Code: [`qwen/qwen3-30b-a3b-thinking-2507/shopping`](./qwen/qwen3-30b-a3b-thinking-2507/shopping/)
- Score: 91.34
- Elapsed Time: 8h 52m 25s
- Token Usage: 244.98M
- Function Calling Success Rate: 79.79%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 804.8K | 7m 47s | 92%
🟢 Database | `namespaces`: 9, `models`: 37 | 4.10M | 12m 23s | 88%
🟢 Interface | `operations`: 122, `schemas`: 170 | 125.93M | 3h 21m 57s | 78%
🟢 Test | `functions`: 213 | 74.29M | 1h 52m 0s | 90%
🟡 Realize | `functions`: 194, `errors`: 28 | 39.85M | 3h 18m 15s | 67%


## `deepseek/deepseek-v3.1-terminus-exacto`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./deepseek/deepseek-v3.1-terminus-exacto/todo/) | 98.13 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`bbs`](./deepseek/deepseek-v3.1-terminus-exacto/bbs/) | 99.33 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`reddit`](./deepseek/deepseek-v3.1-terminus-exacto/reddit/) | 45 | 🟢 | 🟢 | 🟡 | ❌ | ❌
[`shopping`](./deepseek/deepseek-v3.1-terminus-exacto/shopping/) | 45 | 🟢 | 🟢 | 🟡 | ❌ | ❌

### `deepseek/deepseek-v3.1-terminus:exacto` - `todo`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/todo`](./deepseek/deepseek-v3.1-terminus-exacto/todo/)
- Score: 98.13
- Elapsed Time: 3h 40m 45s
- Token Usage: 79.27M
- Function Calling Success Rate: 83.78%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 761.3K | 3m 17s | 100%
🟢 Database | `namespaces`: 5, `models`: 44 | 5.74M | 13m 37s | 89%
🟢 Interface | `operations`: 39, `schemas`: 53 | 49.80M | 1h 51m 7s | 76%
🟢 Test | `functions`: 116 | 15.85M | 33m 55s | 96%
🟡 Realize | `functions`: 64, `errors`: 2 | 7.11M | 58m 48s | 79%


### `deepseek/deepseek-v3.1-terminus:exacto` - `bbs`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/bbs`](./deepseek/deepseek-v3.1-terminus-exacto/bbs/)
- Score: 99.33
- Elapsed Time: 13h 20m 54s
- Token Usage: 617.41M
- Function Calling Success Rate: 84.58%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 682.8K | 13m 45s | 100%
🟢 Database | `namespaces`: 7, `models`: 76 | 10.12M | 28m 25s | 93%
🟢 Interface | `operations`: 388, `schemas`: 323 | 397.35M | 7h 40m 34s | 76%
🟢 Test | `functions`: 1171 | 156.96M | 3h 31m 48s | 96%
🟡 Realize | `functions`: 536, `errors`: 6 | 52.29M | 1h 26m 20s | 83%


### `deepseek/deepseek-v3.1-terminus:exacto` - `reddit`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/reddit`](./deepseek/deepseek-v3.1-terminus-exacto/reddit/)
- Score: 45
- Elapsed Time: 1h 13m 9s
- Token Usage: 30.96M
- Function Calling Success Rate: 82.91%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 858.7K | 13m 25s | 100%
🟢 Database | `namespaces`: 9, `models`: 112 | 14.68M | 59m 43s | 90%
🔴 Interface |  | 15.42M | 0s | 71%
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `deepseek/deepseek-v3.1-terminus:exacto` - `shopping`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/shopping`](./deepseek/deepseek-v3.1-terminus-exacto/shopping/)
- Score: 45
- Elapsed Time: 54m 53s
- Token Usage: 18.84M
- Function Calling Success Rate: 92.56%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 11 | 893.3K | 19m 56s | 100%
🟢 Database | `namespaces`: 7, `models`: 99 | 14.61M | 34m 56s | 93%
🔴 Interface |  | 3.33M | 0s | 83%
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 