# AutoBe Generated Examples

## Benchmark

AI Model | Success | Score | FCSR | Status 
:--------|---------|------:|-----:|:------:
[`qwen/qwen3.5-122b-a10b`](#qwenqwen35-122b-a10b) | 4 | 100 | 86% | 🟢
[`z-ai/glm-5`](#z-aiglm-5) | 4 | 100 | 87% | 🟢
[`qwen/qwen3-coder-next`](#qwenqwen3-coder-next) | 2 | 99.36 | 64% | 🟡
[`qwen/qwen3.5-35b-a3b`](#qwenqwen35-35b-a3b) | 1 | 98.69 | 75% | 🟡
[`deepseek/deepseek-v3.1-terminus-exacto`](#deepseekdeepseek-v31-terminus-exacto) | 1 | 66.19 | 86% | 🟡
[`qwen/qwen3.5-397b-a17b`](#qwenqwen35-397b-a17b) | 2 | 61.25 | 90% | 🟡

- FCSR: Function Calling Success Rate
- Status:
  - 🟢: All projects completed successfully
  - 🟡: Some projects failed
  - ❌: All projects failed or not executed

## `qwen/qwen3.5-122b-a10b`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3.5-122b-a10b/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./qwen/qwen3.5-122b-a10b/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./qwen/qwen3.5-122b-a10b/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./qwen/qwen3.5-122b-a10b/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `qwen/qwen3.5-122b-a10b` - `todo`

- Source Code: [`qwen/qwen3.5-122b-a10b/todo`](./qwen/qwen3.5-122b-a10b/todo/)
- Score: 100
- Elapsed Time: 1h 27m 10s
- Token Usage: 28.10M
- Function Calling Success Rate: 87.13%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 804.3K | 14m 34s | 91%
🟢 Database | `namespaces`: 2, `models`: 8 | 713.0K | 2m 20s | 100%
🟢 Interface | `operations`: 22, `schemas`: 31 | 17.25M | 54m 39s | 80%
🟢 Test | `functions`: 66 | 6.41M | 8m 38s | 95%
🟢 Realize | `functions`: 33 | 2.92M | 6m 57s | 84%


### `qwen/qwen3.5-122b-a10b` - `bbs`

- Source Code: [`qwen/qwen3.5-122b-a10b/bbs`](./qwen/qwen3.5-122b-a10b/bbs/)
- Score: 100
- Elapsed Time: 2h 35m 50s
- Token Usage: 83.85M
- Function Calling Success Rate: 88.35%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 1.67M | 29m 44s | 89%
🟢 Database | `namespaces`: 6, `models`: 22 | 2.85M | 6m 4s | 95%
🟢 Interface | `operations`: 72, `schemas`: 88 | 48.36M | 1h 0m 54s | 82%
🟢 Test | `functions`: 204 | 21.10M | 27m 59s | 97%
🟢 Realize | `functions`: 108 | 9.87M | 31m 7s | 84%


### `qwen/qwen3.5-122b-a10b` - `reddit`

- Source Code: [`qwen/qwen3.5-122b-a10b/reddit`](./qwen/qwen3.5-122b-a10b/reddit/)
- Score: 100
- Elapsed Time: 3h 40m 14s
- Token Usage: 108.77M
- Function Calling Success Rate: 83.63%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.33M | 23m 50s | 94%
🟢 Database | `namespaces`: 6, `models`: 21 | 2.71M | 15m 59s | 95%
🟢 Interface | `operations`: 62, `schemas`: 80 | 67.76M | 1h 47m 8s | 69%
🟢 Test | `functions`: 183 | 25.28M | 36m 44s | 97%
🟢 Realize | `functions`: 98 | 11.70M | 36m 32s | 89%


### `qwen/qwen3.5-122b-a10b` - `shopping`

- Source Code: [`qwen/qwen3.5-122b-a10b/shopping`](./qwen/qwen3.5-122b-a10b/shopping/)
- Score: 100
- Elapsed Time: 4h 55m 40s
- Token Usage: 285.94M
- Function Calling Success Rate: 86.08%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 3.83M | 47m 7s | 86%
🟢 Database | `namespaces`: 10, `models`: 30 | 5.01M | 8m 15s | 97%
🟢 Interface | `operations`: 148, `schemas`: 155 | 160.24M | 1h 52m 35s | 74%
🟢 Test | `functions`: 429 | 84.24M | 1h 13m 44s | 97%
🟢 Realize | `functions`: 207 | 32.63M | 53m 57s | 90%


## `z-ai/glm-5`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./z-ai/glm-5/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./z-ai/glm-5/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./z-ai/glm-5/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./z-ai/glm-5/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `z-ai/glm-5` - `todo`

- Source Code: [`z-ai/glm-5/todo`](./z-ai/glm-5/todo/)
- Score: 100
- Elapsed Time: 2h 19m 54s
- Token Usage: 23.65M
- Function Calling Success Rate: 93.37%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 590.9K | 38m 53s | 98%
🟢 Database | `namespaces`: 2, `models`: 6 | 978.3K | 10m 9s | 96%
🟢 Interface | `operations`: 20, `schemas`: 26 | 14.28M | 32m 30s | 91%
🟢 Test | `functions`: 61 | 5.56M | 42m 57s | 96%
🟢 Realize | `functions`: 29 | 2.23M | 15m 23s | 86%


### `z-ai/glm-5` - `bbs`

- Source Code: [`z-ai/glm-5/bbs`](./z-ai/glm-5/bbs/)
- Score: 100
- Elapsed Time: 3h 34m 39s
- Token Usage: 95.30M
- Function Calling Success Rate: 87.69%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 927.5K | 27m 51s | 97%
🟢 Database | `namespaces`: 5, `models`: 18 | 2.64M | 23m 26s | 100%
🟢 Interface | `operations`: 56, `schemas`: 80 | 66.41M | 1h 24m 43s | 80%
🟢 Test | `functions`: 175 | 18.11M | 41m 1s | 95%
🟢 Realize | `functions`: 87 | 7.21M | 37m 36s | 87%


### `z-ai/glm-5` - `reddit`

- Source Code: [`z-ai/glm-5/reddit`](./z-ai/glm-5/reddit/)
- Score: 100
- Elapsed Time: 5h 46m 5s
- Token Usage: 128.76M
- Function Calling Success Rate: 88.49%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.41M | 1h 15m 29s | 93%
🟢 Database | `namespaces`: 8, `models`: 20 | 3.62M | 15m 36s | 100%
🟢 Interface | `operations`: 73, `schemas`: 79 | 86.07M | 2h 28m 57s | 82%
🟢 Test | `functions`: 232 | 27.45M | 1h 9m 23s | 94%
🟢 Realize | `functions`: 110 | 10.21M | 36m 37s | 87%


### `z-ai/glm-5` - `shopping`

- Source Code: [`z-ai/glm-5/shopping`](./z-ai/glm-5/shopping/)
- Score: 100
- Elapsed Time: 8h 37m 29s
- Token Usage: 169.28M
- Function Calling Success Rate: 86.05%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 3.63M | 2h 0m 17s | 96%
🟢 Database | `namespaces`: 9, `models`: 32 | 7.91M | 25m 52s | 99%
🟢 Interface | `operations`: 123, `schemas`: 137 | 93.00M | 2h 32m 40s | 82%
🟢 Test | `functions`: 337 | 42.81M | 1h 29m 27s | 94%
🟢 Realize | `functions`: 180 | 21.92M | 2h 9m 12s | 76%


## `qwen/qwen3-coder-next`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-coder-next/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./qwen/qwen3-coder-next/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./qwen/qwen3-coder-next/reddit/) | 99.06 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./qwen/qwen3-coder-next/shopping/) | 98.39 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

### `qwen/qwen3-coder-next` - `todo`

- Source Code: [`qwen/qwen3-coder-next/todo`](./qwen/qwen3-coder-next/todo/)
- Score: 100
- Elapsed Time: 1h 36m 29s
- Token Usage: 47.17M
- Function Calling Success Rate: 78.85%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 890.0K | 22m 24s | 87%
🟢 Database | `namespaces`: 5, `models`: 12 | 2.24M | 3m 27s | 82%
🟢 Interface | `operations`: 27, `schemas`: 36 | 28.21M | 25m 12s | 66%
🟢 Test | `functions`: 67 | 10.58M | 20m 48s | 91%
🟢 Realize | `functions`: 36 | 5.26M | 24m 36s | 81%


### `qwen/qwen3-coder-next` - `bbs`

- Source Code: [`qwen/qwen3-coder-next/bbs`](./qwen/qwen3-coder-next/bbs/)
- Score: 100
- Elapsed Time: 3h 4m 40s
- Token Usage: 183.20M
- Function Calling Success Rate: 50.59%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 6 | 1.88M | 38m 3s | 87%
🟢 Database | `namespaces`: 3, `models`: 18 | 4.62M | 10m 20s | 71%
🟢 Interface | `operations`: 77, `schemas`: 63 | 78.72M | 47m 37s | 53%
🟢 Test | `functions`: 187 | 76.45M | 57m 16s | 40%
🟢 Realize | `functions`: 101 | 21.53M | 31m 22s | 55%


### `qwen/qwen3-coder-next` - `reddit`

- Source Code: [`qwen/qwen3-coder-next/reddit`](./qwen/qwen3-coder-next/reddit/)
- Score: 99.06
- Elapsed Time: 3h 26m 8s
- Token Usage: 203.53M
- Function Calling Success Rate: 67.99%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 6 | 1.29M | 17m 39s | 86%
🟢 Database | `namespaces`: 5, `models`: 28 | 6.44M | 4m 43s | 78%
🟢 Interface | `operations`: 92, `schemas`: 93 | 124.10M | 55m 13s | 55%
🟢 Test | `functions`: 246 | 53.48M | 1h 11m 48s | 88%
🟡 Realize | `functions`: 127, `errors`: 2 | 18.22M | 56m 43s | 63%


### `qwen/qwen3-coder-next` - `shopping`

- Source Code: [`qwen/qwen3-coder-next/shopping`](./qwen/qwen3-coder-next/shopping/)
- Score: 98.39
- Elapsed Time: 6h 12m 35s
- Token Usage: 543.81M
- Function Calling Success Rate: 66.51%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 3.66M | 30m 30s | 93%
🟢 Database | `namespaces`: 11, `models`: 54 | 7.48M | 14m 20s | 89%
🟢 Interface | `operations`: 172, `schemas`: 194 | 314.37M | 1h 45m 53s | 51%
🟢 Test | `functions`: 475 | 140.48M | 1h 21m 36s | 90%
🟡 Realize | `functions`: 261, `errors`: 7 | 77.81M | 2h 20m 15s | 58%


## `qwen/qwen3.5-35b-a3b`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3.5-35b-a3b/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./qwen/qwen3.5-35b-a3b/bbs/) | 98.29 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`reddit`](./qwen/qwen3.5-35b-a3b/reddit/) | 99.22 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./qwen/qwen3.5-35b-a3b/shopping/) | 97.26 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

### `qwen/qwen3.5-35b-a3b` - `todo`

- Source Code: [`qwen/qwen3.5-35b-a3b/todo`](./qwen/qwen3.5-35b-a3b/todo/)
- Score: 100
- Elapsed Time: 1h 2m 39s
- Token Usage: 33.87M
- Function Calling Success Rate: 82.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 912.6K | 11m 38s | 90%
🟢 Database | `namespaces`: 2, `models`: 9 | 1.01M | 1m 46s | 89%
🟢 Interface | `operations`: 23, `schemas`: 33 | 19.99M | 18m 30s | 73%
🟢 Test | `functions`: 72 | 8.78M | 22m 43s | 89%
🟢 Realize | `functions`: 37 | 3.19M | 8m 1s | 81%


### `qwen/qwen3.5-35b-a3b` - `bbs`

- Source Code: [`qwen/qwen3.5-35b-a3b/bbs`](./qwen/qwen3.5-35b-a3b/bbs/)
- Score: 98.29
- Elapsed Time: 4h 38m 55s
- Token Usage: 82.59M
- Function Calling Success Rate: 73.40%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 2.20M | 38m 45s | 87%
🟢 Database | `namespaces`: 5, `models`: 9 | 2.20M | 19m 25s | 73%
🟢 Interface | `operations`: 49, `schemas`: 61 | 43.64M | 59m 0s | 63%
🟢 Test | `functions`: 136 | 22.04M | 1h 26m 8s | 80%
🟡 Realize | `functions`: 70, `errors`: 2 | 12.52M | 1h 15m 34s | 73%


### `qwen/qwen3.5-35b-a3b` - `reddit`

- Source Code: [`qwen/qwen3.5-35b-a3b/reddit`](./qwen/qwen3.5-35b-a3b/reddit/)
- Score: 99.22
- Elapsed Time: 9h 36m 39s
- Token Usage: 200.65M
- Function Calling Success Rate: 72.60%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 1.57M | 19m 23s | 90%
🟢 Database | `namespaces`: 8, `models`: 26 | 4.80M | 59m 42s | 76%
🟢 Interface | `operations`: 103, `schemas`: 126 | 101.30M | 1h 49m 19s | 68%
🟢 Test | `functions`: 273 | 64.92M | 3h 11m 7s | 75%
🟡 Realize | `functions`: 154, `errors`: 2 | 28.07M | 3h 17m 6s | 73%


### `qwen/qwen3.5-35b-a3b` - `shopping`

- Source Code: [`qwen/qwen3.5-35b-a3b/shopping`](./qwen/qwen3.5-35b-a3b/shopping/)
- Score: 97.26
- Elapsed Time: 10h 56m 25s
- Token Usage: 259.04M
- Function Calling Success Rate: 76.89%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 4.20M | 1h 42m 3s | 91%
🟢 Database | `namespaces`: 9, `models`: 37 | 10.05M | 22m 10s | 71%
🟢 Interface | `operations`: 120, `schemas`: 192 | 134.69M | 2h 37m 38s | 70%
🟢 Test | `functions`: 333 | 71.57M | 2h 27m 48s | 84%
🟡 Realize | `functions`: 197, `errors`: 9 | 38.53M | 3h 46m 43s | 73%


## `deepseek/deepseek-v3.1-terminus-exacto`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./deepseek/deepseek-v3.1-terminus-exacto/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./deepseek/deepseek-v3.1-terminus-exacto/bbs/) | 99.75 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`reddit`](./deepseek/deepseek-v3.1-terminus-exacto/reddit/) | 45 | 🟢 | 🟢 | 🟡 | ❌ | ❌
[`shopping`](./deepseek/deepseek-v3.1-terminus-exacto/shopping/) | 20 | 🟢 | 🟡 | ❌ | ❌ | ❌

### `deepseek/deepseek-v3.1-terminus:exacto` - `todo`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/todo`](./deepseek/deepseek-v3.1-terminus-exacto/todo/)
- Score: 100
- Elapsed Time: 3h 27m 41s
- Token Usage: 110.58M
- Function Calling Success Rate: 86.26%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 869.4K | 45m 20s | 93%
🟢 Database | `namespaces`: 4, `models`: 27 | 2.46M | 9m 57s | 95%
🟢 Interface | `operations`: 85, `schemas`: 121 | 66.54M | 1h 2m 58s | 83%
🟢 Test | `functions`: 270 | 25.60M | 44m 51s | 95%
🟢 Realize | `functions`: 139 | 15.11M | 44m 34s | 76%


### `deepseek/deepseek-v3.1-terminus:exacto` - `bbs`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/bbs`](./deepseek/deepseek-v3.1-terminus-exacto/bbs/)
- Score: 99.75
- Elapsed Time: 9h 25m 14s
- Token Usage: 411.18M
- Function Calling Success Rate: 86.39%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 6 | 1.38M | 1h 34m 38s | 93%
🟢 Database | `namespaces`: 7, `models`: 78 | 8.19M | 17m 15s | 95%
🟢 Interface | `operations`: 351, `schemas`: 258 | 214.05M | 3h 8m 2s | 79%
🟢 Test | `functions`: 1063 | 125.63M | 3h 3m 24s | 96%
🟡 Realize | `functions`: 473, `errors`: 2 | 61.92M | 1h 21m 52s | 81%


### `deepseek/deepseek-v3.1-terminus:exacto` - `reddit`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/reddit`](./deepseek/deepseek-v3.1-terminus-exacto/reddit/)
- Score: 45
- Elapsed Time: 2h 5m 33s
- Token Usage: 12.44M
- Function Calling Success Rate: 91.22%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 6 | 1.60M | 1h 29m 58s | 92%
🟢 Database | `namespaces`: 11, `models`: 109 | 10.84M | 35m 35s | 90%
🔴 Interface |  | 109.01M | 0s | 81%
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `deepseek/deepseek-v3.1-terminus:exacto` - `shopping`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/shopping`](./deepseek/deepseek-v3.1-terminus-exacto/shopping/)
- Score: 20
- Elapsed Time: 3h 28m 52s
- Token Usage: 3.48M
- Function Calling Success Rate: 93.81%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 6 | 3.48M | 3h 28m 52s | 93%
🔴 Database |  | 0 | 0s | NaN%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `qwen/qwen3.5-397b-a17b`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3.5-397b-a17b/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./qwen/qwen3.5-397b-a17b/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./qwen/qwen3.5-397b-a17b/reddit/) | 45 | 🟢 | 🟢 | 🟡 | ❌ | ❌
`shopping` | 0 | ❌ | ❌ | ❌ | ❌ | ❌

### `qwen/qwen3.5-397b-a17b` - `todo`

- Source Code: [`qwen/qwen3.5-397b-a17b/todo`](./qwen/qwen3.5-397b-a17b/todo/)
- Score: 100
- Elapsed Time: 1h 50m 23s
- Token Usage: 45.56M
- Function Calling Success Rate: 85.14%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 639.5K | 50m 10s | 98%
🟢 Database | `namespaces`: 2, `models`: 8 | 1.63M | 5m 51s | 100%
🟢 Interface | `operations`: 23, `schemas`: 31 | 33.21M | 37m 35s | 75%
🟢 Test | `functions`: 68 | 7.12M | 8m 3s | 92%
🟢 Realize | `functions`: 35 | 2.97M | 8m 42s | 89%


### `qwen/qwen3.5-397b-a17b` - `bbs`

- Source Code: [`qwen/qwen3.5-397b-a17b/bbs`](./qwen/qwen3.5-397b-a17b/bbs/)
- Score: 100
- Elapsed Time: 3h 2m 40s
- Token Usage: 157.18M
- Function Calling Success Rate: 90.89%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 897.0K | 55m 23s | 98%
🟢 Database | `namespaces`: 6, `models`: 23 | 5.22M | 10m 54s | 96%
🟢 Interface | `operations`: 76, `schemas`: 94 | 109.10M | 45m 20s | 87%
🟢 Test | `functions`: 227 | 30.43M | 58m 11s | 93%
🟢 Realize | `functions`: 115 | 11.53M | 12m 50s | 91%


### `qwen/qwen3.5-397b-a17b` - `reddit`

- Source Code: [`qwen/qwen3.5-397b-a17b/reddit`](./qwen/qwen3.5-397b-a17b/reddit/)
- Score: 45
- Elapsed Time: 1h 16m 43s
- Token Usage: 8.99M
- Function Calling Success Rate: 98.92%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 1.14M | 1h 8m 31s | 99%
🟢 Database | `namespaces`: 8, `models`: 24 | 7.85M | 8m 12s | 98%
🔴 Interface |  | 40.09M | 0s | 95%
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 