# AutoBe Generated Examples

## Benchmark

AI Model | Success | Score | FCSR | Status 
:--------|---------|------:|-----:|:------:
[`qwen/qwen3.5-122b-a10b`](#qwenqwen35-122b-a10b) | 3 | 99.86 | 84% | 🟢
[`z-ai/glm-5`](#z-aiglm-5) | 3 | 99.85 | 84% | 🟢
[`qwen/qwen3.5-35b-a3b`](#qwenqwen35-35b-a3b) | 1 | 98.94 | 73% | 🟡
[`deepseek/deepseek-v3.1-terminus-exacto`](#deepseekdeepseek-v31-terminus-exacto) | 2 | 97.91 | 85% | 🟡
[`qwen/qwen3-coder-next`](#qwenqwen3-coder-next) | 1 | 84.27 | 51% | 🟡

- FCSR: Function Calling Success Rate
- Status:
  - 🟢: All projects completed successfully
  - 🟡: Some projects failed
  - ❌: All projects failed or not executed

## `qwen/qwen3.5-122b-a10b`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3.5-122b-a10b/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./qwen/qwen3.5-122b-a10b/bbs/) | 99.44 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
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
- Score: 99.44
- Elapsed Time: 3h 22m 22s
- Token Usage: 119.85M
- Function Calling Success Rate: 83.26%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 1.67M | 29m 44s | 89%
🟢 Database | `namespaces`: 6, `models`: 22 | 2.85M | 6m 4s | 95%
🟢 Interface | `operations`: 74, `schemas`: 105 | 77.39M | 1h 37m 23s | 73%
🟢 Test | `functions`: 214 | 25.46M | 34m 48s | 94%
🟡 Realize | `functions`: 107, `errors`: 1 | 12.48M | 34m 21s | 87%


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
[`shopping`](./z-ai/glm-5/shopping/) | 99.38 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

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
- Score: 99.38
- Elapsed Time: 9h 47m 17s
- Token Usage: 346.88M
- Function Calling Success Rate: 79.26%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 3.63M | 2h 0m 17s | 96%
🟢 Database | `namespaces`: 9, `models`: 32 | 7.91M | 25m 52s | 99%
🟢 Interface | `operations`: 125, `schemas`: 155 | 232.21M | 3h 12m 39s | 67%
🟢 Test | `functions`: 392 | 66.23M | 1h 43m 4s | 95%
🟡 Realize | `functions`: 192, `errors`: 2 | 36.90M | 2h 25m 24s | 78%


## `qwen/qwen3.5-35b-a3b`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3.5-35b-a3b/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./qwen/qwen3.5-35b-a3b/bbs/) | 97.57 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`reddit`](./qwen/qwen3.5-35b-a3b/reddit/) | 98.84 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./qwen/qwen3.5-35b-a3b/shopping/) | 99.36 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

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
- Score: 97.57
- Elapsed Time: 3h 33m 40s
- Token Usage: 103.12M
- Function Calling Success Rate: 74.66%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 2.20M | 38m 45s | 87%
🟢 Database | `namespaces`: 5, `models`: 9 | 2.20M | 19m 25s | 73%
🟢 Interface | `operations`: 51, `schemas`: 64 | 55.38M | 33m 55s | 67%
🟢 Test | `functions`: 131 | 25.13M | 55m 10s | 84%
🟡 Realize | `functions`: 74, `errors`: 3 | 18.22M | 1h 6m 22s | 69%


### `qwen/qwen3.5-35b-a3b` - `reddit`

- Source Code: [`qwen/qwen3.5-35b-a3b/reddit`](./qwen/qwen3.5-35b-a3b/reddit/)
- Score: 98.84
- Elapsed Time: 6h 53m 2s
- Token Usage: 245.47M
- Function Calling Success Rate: 70.58%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 1.57M | 19m 23s | 90%
🟢 Database | `namespaces`: 8, `models`: 26 | 4.80M | 59m 42s | 76%
🟢 Interface | `operations`: 101, `schemas`: 132 | 151.74M | 2h 9m 3s | 56%
🟢 Test | `functions`: 291 | 56.66M | 1h 26m 35s | 86%
🟡 Realize | `functions`: 155, `errors`: 3 | 30.71M | 1h 58m 17s | 75%


### `qwen/qwen3.5-35b-a3b` - `shopping`

- Source Code: [`qwen/qwen3.5-35b-a3b/shopping`](./qwen/qwen3.5-35b-a3b/shopping/)
- Score: 99.36
- Elapsed Time: 6h 44m 38s
- Token Usage: 359.16M
- Function Calling Success Rate: 73.24%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 4.20M | 1h 42m 3s | 91%
🟢 Database | `namespaces`: 9, `models`: 37 | 10.05M | 22m 10s | 71%
🟢 Interface | `operations`: 122, `schemas`: 175 | 207.79M | 2h 0m 52s | 60%
🟢 Test | `functions`: 306 | 91.37M | 1h 33m 6s | 83%
🟡 Realize | `functions`: 188, `errors`: 2 | 45.75M | 1h 6m 24s | 78%


## `deepseek/deepseek-v3.1-terminus-exacto`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./deepseek/deepseek-v3.1-terminus-exacto/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`bbs`](./deepseek/deepseek-v3.1-terminus-exacto/bbs/) | 92.31 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`reddit`](./deepseek/deepseek-v3.1-terminus-exacto/reddit/) | 99.34 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./deepseek/deepseek-v3.1-terminus-exacto/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `deepseek/deepseek-v3.1-terminus:exacto` - `todo`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/todo`](./deepseek/deepseek-v3.1-terminus-exacto/todo/)
- Score: 100
- Elapsed Time: 4h 12m 35s
- Token Usage: 68.88M
- Function Calling Success Rate: 87.29%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 11 | 761.3K | 3m 17s | 100%
🟢 Database | `namespaces`: 5, `models`: 44 | 5.74M | 13m 37s | 89%
🟢 Interface | `operations`: 43, `schemas`: 57 | 36.74M | 2h 9m 10s | 85%
🟢 Test | `functions`: 119 | 15.38M | 52m 55s | 94%
🟢 Realize | `functions`: 66 | 10.27M | 53m 34s | 78%


### `deepseek/deepseek-v3.1-terminus:exacto` - `bbs`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/bbs`](./deepseek/deepseek-v3.1-terminus-exacto/bbs/)
- Score: 92.31
- Elapsed Time: 23h 21m 41s
- Token Usage: 654.70M
- Function Calling Success Rate: 84.86%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 11 | 682.8K | 13m 45s | 100%
🟢 Database | `namespaces`: 7, `models`: 76 | 10.12M | 28m 25s | 93%
🟢 Interface | `operations`: 438, `schemas`: 323 | 255.69M | 13h 37m 39s | 85%
🟢 Test | `functions`: 1195 | 232.70M | 3h 21m 43s | 92%
🟡 Realize | `functions`: 585, `errors`: 75 | 155.49M | 5h 40m 7s | 73%


### `deepseek/deepseek-v3.1-terminus:exacto` - `reddit`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/reddit`](./deepseek/deepseek-v3.1-terminus-exacto/reddit/)
- Score: 99.34
- Elapsed Time: 12h 16m 21s
- Token Usage: 448.48M
- Function Calling Success Rate: 86.90%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 12 | 858.7K | 13m 25s | 100%
🟢 Database | `namespaces`: 7, `models`: 87 | 9.87M | 30m 54s | 93%
🟢 Interface | `operations`: 322, `schemas`: 290 | 249.02M | 5h 50m 23s | 83%
🟢 Test | `functions`: 978 | 126.57M | 3h 26m 59s | 94%
🟡 Realize | `functions`: 457, `errors`: 5 | 62.17M | 2h 14m 38s | 82%


### `deepseek/deepseek-v3.1-terminus:exacto` - `shopping`

- Source Code: [`deepseek/deepseek-v3.1-terminus-exacto/shopping`](./deepseek/deepseek-v3.1-terminus-exacto/shopping/)
- Score: 100
- Elapsed Time: 16h 56m 2s
- Token Usage: 504.08M
- Function Calling Success Rate: 85.34%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 11 | 893.3K | 19m 56s | 100%
🟢 Database | `namespaces`: 7, `models`: 99 | 14.61M | 34m 56s | 93%
🟢 Interface | `operations`: 351, `schemas`: 305 | 238.75M | 9h 44m 1s | 82%
🟢 Test | `functions`: 939 | 171.90M | 3h 54m 10s | 91%
🟢 Realize | `functions`: 490 | 77.92M | 2h 22m 57s | 78%


## `qwen/qwen3-coder-next`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-coder-next/todo/) | 94.55 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`bbs`](./qwen/qwen3-coder-next/bbs/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./qwen/qwen3-coder-next/reddit/) | 97.54 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./qwen/qwen3-coder-next/shopping/) | 45 | 🟢 | 🟢 | 🟡 | ❌ | ❌

### `qwen/qwen3-coder-next` - `todo`

- Source Code: [`qwen/qwen3-coder-next/todo`](./qwen/qwen3-coder-next/todo/)
- Score: 94.55
- Elapsed Time: 1h 50m 55s
- Token Usage: 53.61M
- Function Calling Success Rate: 56.87%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 890.0K | 22m 24s | 87%
🟢 Database | `namespaces`: 5, `models`: 12 | 2.24M | 3m 27s | 82%
🟢 Interface | `operations`: 24, `schemas`: 32 | 26.78M | 28m 54s | 51%
🟢 Test | `functions`: 61 | 15.99M | 20m 36s | 49%
🟡 Realize | `functions`: 33, `errors`: 3 | 7.72M | 35m 32s | 59%


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
- Score: 97.54
- Elapsed Time: 3h 27m 6s
- Token Usage: 286.83M
- Function Calling Success Rate: 47.53%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 6 | 1.29M | 17m 39s | 86%
🟢 Database | `namespaces`: 5, `models`: 28 | 6.44M | 4m 43s | 78%
🟢 Interface | `operations`: 90, `schemas`: 84 | 110.43M | 50m 22s | 54%
🟢 Test | `functions`: 236 | 117.08M | 1h 18m 35s | 34%
🟡 Realize | `functions`: 122, `errors`: 5 | 51.59M | 55m 45s | 53%


### `qwen/qwen3-coder-next` - `shopping`

- Source Code: [`qwen/qwen3-coder-next/shopping`](./qwen/qwen3-coder-next/shopping/)
- Score: 45
- Elapsed Time: 1h 1m 1s
- Token Usage: 25.02M
- Function Calling Success Rate: 81.94%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 5, `documents`: 6 | 6.45M | 49m 2s | 86%
🟢 Database | `namespaces`: 8, `models`: 45 | 18.58M | 11m 59s | 76%
🔴 Interface |  | 82.30M | 0s | 33%
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 