# AutoBe Generated Examples

## Benchmark

AI Model | Success | Score | FCSR | Status 
:--------|---------|------:|-----:|:------:
[`openai/gpt-4.1-mini`](#openaigpt-41-mini) | 1 | 98.99 | 83% | 🟡
[`qwen/qwen3-coder-next`](#qwenqwen3-coder-next) | 0 | 98.43 | 47% | 🟡
[`qwen/qwen3-next-80b-a3b-instruct`](#qwenqwen3-next-80b-a3b-instruct) | 1 | 95.3 | 73% | 🟡
[`qwen/qwen3-30b-a3b-thinking-2507`](#qwenqwen3-30b-a3b-thinking-2507) | 0 | 90.34 | 80% | 🟡
[`deepseek/deepseek-v3.1-terminus-exacto`](#deepseekdeepseek-v31-terminus-exacto) | 0 | 71.86 | 84% | 🟡

- FCSR: Function Calling Success Rate
- Status:
  - 🟢: All projects completed successfully
  - 🟡: Some projects failed
  - ❌: All projects failed or not executed

## `openai/gpt-4.1-mini`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-4.1-mini/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./openai/gpt-4.1-mini/bbs/) | 98.64 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`reddit`](./openai/gpt-4.1-mini/reddit/) | 98.52 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./openai/gpt-4.1-mini/shopping/) | 98.82 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

### `openai/gpt-4.1-mini` - `todo`

- Source Code: [`openai/gpt-4.1-mini/todo`](./openai/gpt-4.1-mini/todo/)
- Score: 100
- Elapsed Time: 54m 21s
- Token Usage: 26.54M
- Function Calling Success Rate: 75.54%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 12 | 502.6K | 2m 14s | 100%
🟢 Database | `namespaces`: 2, `models`: 6 | 2.16M | 7m 9s | 34%
🟢 Interface | `operations`: 23, `schemas`: 34 | 16.84M | 29m 11s | 64%
🟢 Test | `functions`: 54 | 5.92M | 7m 15s | 100%
🟢 Realize | `functions`: 25 | 1.11M | 8m 31s | 98%


### `openai/gpt-4.1-mini` - `bbs`

- Source Code: [`openai/gpt-4.1-mini/bbs`](./openai/gpt-4.1-mini/bbs/)
- Score: 98.64
- Elapsed Time: 2h 36m 58s
- Token Usage: 187.02M
- Function Calling Success Rate: 85.61%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 492.0K | 3m 8s | 100%
🟢 Database | `namespaces`: 7, `models`: 36 | 9.66M | 17m 19s | 34%
🟢 Interface | `operations`: 201, `schemas`: 182 | 100.17M | 1h 0m 46s | 77%
🟢 Test | `functions`: 478 | 63.70M | 40m 44s | 98%
🟡 Realize | `functions`: 220, `errors`: 5 | 12.99M | 34m 59s | 98%


### `openai/gpt-4.1-mini` - `reddit`

- Source Code: [`openai/gpt-4.1-mini/reddit`](./openai/gpt-4.1-mini/reddit/)
- Score: 98.52
- Elapsed Time: 2h 47m 20s
- Token Usage: 222.53M
- Function Calling Success Rate: 82.58%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 12 | 522.3K | 4m 17s | 100%
🟢 Database | `namespaces`: 7, `models`: 43 | 14.48M | 22m 51s | 27%
🟢 Interface | `operations`: 222, `schemas`: 197 | 120.34M | 1h 5m 21s | 74%
🟢 Test | `functions`: 510 | 70.32M | 40m 16s | 98%
🟡 Realize | `functions`: 243, `errors`: 6 | 16.87M | 34m 34s | 97%


### `openai/gpt-4.1-mini` - `shopping`

- Source Code: [`openai/gpt-4.1-mini/shopping`](./openai/gpt-4.1-mini/shopping/)
- Score: 98.82
- Elapsed Time: 3h 13m 15s
- Token Usage: 379.39M
- Function Calling Success Rate: 84.73%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 14 | 665.7K | 3m 18s | 100%
🟢 Database | `namespaces`: 10, `models`: 66 | 26.46M | 23m 5s | 25%
🟢 Interface | `operations`: 369, `schemas`: 336 | 200.17M | 1h 8m 26s | 79%
🟢 Test | `functions`: 791 | 123.52M | 1h 0m 2s | 98%
🟡 Realize | `functions`: 406, `errors`: 8 | 28.57M | 38m 22s | 96%


## `qwen/qwen3-coder-next`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-coder-next/todo/) | 97.27 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`bbs`](./qwen/qwen3-coder-next/bbs/) | 99.08 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`reddit`](./qwen/qwen3-coder-next/reddit/) | 99.12 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
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
- Score: 99.12
- Elapsed Time: 5h 22m 57s
- Token Usage: 204.90M
- Function Calling Success Rate: 59.36%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 13 | 1.19M | 6m 56s | 94%
🟢 Database | `namespaces`: 8, `models`: 28 | 4.40M | 9m 45s | 67%
🟢 Interface | `operations`: 95, `schemas`: 88 | 144.82M | 54m 13s | 48%
🟢 Test | `functions`: 248 | 40.10M | 1h 4m 52s | 75%
🟡 Realize | `functions`: 137, `errors`: 2 | 14.39M | 3h 7m 8s | 65%


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
[`reddit`](./qwen/qwen3-next-80b-a3b-instruct/reddit/) | 95 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
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
- Score: 95
- Elapsed Time: 5h 13m 40s
- Token Usage: 138.07M
- Function Calling Success Rate: 70.98%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 5, `documents`: 13 | 1.07M | 8m 16s | 64%
🟢 Database | `namespaces`: 7, `models`: 37 | 5.04M | 8m 28s | 81%
🟢 Interface | `operations`: 83, `schemas`: 80 | 78.09M | 1h 25m 55s | 63%
🟢 Test | `functions`: 166 | 31.69M | 1h 16m 48s | 79%
🟡 Realize | `functions`: 108, `errors`: 9 | 22.18M | 2h 14m 11s | 72%


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
- Elapsed Time: 6h 38m 11s
- Token Usage: 96.70M
- Function Calling Success Rate: 76.13%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 718.6K | 10m 15s | 92%
🟢 Database | `namespaces`: 4, `models`: 17 | 1.98M | 14m 50s | 87%
🟢 Interface | `operations`: 52, `schemas`: 66 | 48.64M | 2h 29m 50s | 69%
🟢 Test | `functions`: 90 | 22.81M | 58m 32s | 91%
🟡 Realize | `functions`: 80, `errors`: 38 | 22.55M | 2h 44m 42s | 71%


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
- Elapsed Time: 6h 22m 43s
- Token Usage: 151.42M
- Function Calling Success Rate: 84.17%

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
- Elapsed Time: 25h 15m 28s
- Token Usage: 1182.52M
- Function Calling Success Rate: 84.71%

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
- Token Usage: 15.54M
- Function Calling Success Rate: 91.37%

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
- Token Usage: 15.51M
- Function Calling Success Rate: 94.29%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 11 | 893.3K | 19m 56s | 100%
🟢 Database | `namespaces`: 7, `models`: 99 | 14.61M | 34m 56s | 93%
🔴 Interface |  | 3.33M | 0s | 83%
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 