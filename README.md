# AutoBe Generated Examples

## Benchmark

AI Model | Success | Score | FCSR | Status 
:--------|---------|------:|-----:|:------:
[`anthropic/claude-sonnet-4.6`](#anthropicclaude-sonnet-46) | 4 | 100 | 82% | 🟢
[`openai/gpt-5.4`](#openaigpt-54) | 4 | 100 | 80% | 🟢
[`moonshotai/kimi-k2.5`](#moonshotaikimi-k25) | 2 | 99.87 | 58% | 🟡
[`qwen/qwen3.5-122b-a10b`](#qwenqwen35-122b-a10b) | 3 | 99.62 | 84% | 🟢
[`qwen/qwen3.5-397b-a17b`](#qwenqwen35-397b-a17b) | 1 | 99.57 | 88% | 🟡
[`qwen/qwen3.5-35b-a3b`](#qwenqwen35-35b-a3b) | 1 | 99.1 | 76% | 🟡
[`z-ai/glm-5`](#z-aiglm-5) | 3 | 86.25 | 88% | 🟢
[`deepseek/deepseek-v3.2`](#deepseekdeepseek-v32) | 1 | 65.86 | 72% | 🟡

- FCSR: Function Calling Success Rate
- Status:
  - 🟢: All projects completed successfully
  - 🟡: Some projects failed
  - ❌: All projects failed or not executed

## `anthropic/claude-sonnet-4.6`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./anthropic/claude-sonnet-4.6/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./anthropic/claude-sonnet-4.6/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./anthropic/claude-sonnet-4.6/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`erp`](./anthropic/claude-sonnet-4.6/erp/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `anthropic/claude-sonnet-4.6` - `todo`

- Source Code: [`anthropic/claude-sonnet-4.6/todo`](./anthropic/claude-sonnet-4.6/todo/)
- Score: 100
- Elapsed Time: 53m 2s
- Token Usage: 24.89M
- Function Calling Success Rate: 85.43%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 516.5K | 10m 23s | 98%
🟢 Database | `namespaces`: 2, `models`: 8 | 826.1K | 3m 18s | 100%
🟢 Interface | `operations`: 21, `schemas`: 26 | 16.52M | 22m 37s | 71%
🟢 Test | `functions`: 60 | 4.67M | 7m 29s | 98%
🟢 Realize | `functions`: 30 | 2.36M | 9m 13s | 92%


### `anthropic/claude-sonnet-4.6` - `reddit`

- Source Code: [`anthropic/claude-sonnet-4.6/reddit`](./anthropic/claude-sonnet-4.6/reddit/)
- Score: 100
- Elapsed Time: 1h 31m 6s
- Token Usage: 80.21M
- Function Calling Success Rate: 90.44%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.12M | 26m 50s | 97%
🟢 Database | `namespaces`: 6, `models`: 20 | 2.20M | 4m 36s | 100%
🟢 Interface | `operations`: 63, `schemas`: 85 | 48.63M | 24m 34s | 84%
🟢 Test | `functions`: 184 | 18.77M | 18m 8s | 97%
🟢 Realize | `functions`: 102 | 9.49M | 16m 56s | 90%


### `anthropic/claude-sonnet-4.6` - `shopping`

- Source Code: [`anthropic/claude-sonnet-4.6/shopping`](./anthropic/claude-sonnet-4.6/shopping/)
- Score: 100
- Elapsed Time: 3h 50m 45s
- Token Usage: 341.56M
- Function Calling Success Rate: 77.42%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 5, `documents`: 6 | 2.77M | 53m 58s | 97%
🟢 Database | `namespaces`: 6, `models`: 39 | 5.07M | 7m 30s | 99%
🟢 Interface | `operations`: 202, `schemas`: 204 | 206.88M | 1h 9m 53s | 63%
🟢 Test | `functions`: 525 | 89.22M | 1h 2m 19s | 91%
🟢 Realize | `functions`: 288 | 37.62M | 37m 3s | 86%


### `anthropic/claude-sonnet-4.6` - `erp`

- Source Code: [`anthropic/claude-sonnet-4.6/erp`](./anthropic/claude-sonnet-4.6/erp/)
- Score: 100
- Elapsed Time: 2h 33m 39s
- Token Usage: 129.72M
- Function Calling Success Rate: 85.35%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 2.23M | 54m 33s | 98%
🟢 Database | `namespaces`: 6, `models`: 20 | 2.68M | 4m 46s | 100%
🟢 Interface | `operations`: 89, `schemas`: 103 | 83.06M | 45m 12s | 74%
🟢 Test | `functions`: 208 | 26.95M | 23m 46s | 96%
🟢 Realize | `functions`: 137 | 14.80M | 25m 20s | 94%


## `openai/gpt-5.4`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-5.4/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./openai/gpt-5.4/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./openai/gpt-5.4/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`erp`](./openai/gpt-5.4/erp/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `openai/gpt-5.4` - `todo`

- Source Code: [`openai/gpt-5.4/todo`](./openai/gpt-5.4/todo/)
- Score: 100
- Elapsed Time: 37m 26s
- Token Usage: 21.01M
- Function Calling Success Rate: 78.92%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 1, `documents`: 6 | 536.5K | 6m 3s | 96%
🟢 Database | `namespaces`: 2, `models`: 7 | 515.8K | 1m 45s | 100%
🟢 Interface | `operations`: 22, `schemas`: 34 | 13.68M | 18m 29s | 66%
🟢 Test | `functions`: 68 | 4.32M | 6m 6s | 98%
🟢 Realize | `functions`: 36 | 1.96M | 5m 1s | 68%


### `openai/gpt-5.4` - `reddit`

- Source Code: [`openai/gpt-5.4/reddit`](./openai/gpt-5.4/reddit/)
- Score: 100
- Elapsed Time: 1h 41m 39s
- Token Usage: 165.97M
- Function Calling Success Rate: 79.26%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 1.18M | 15m 41s | 97%
🟢 Database | `namespaces`: 6, `models`: 40 | 2.92M | 3m 9s | 100%
🟢 Interface | `operations`: 158, `schemas`: 163 | 99.98M | 28m 44s | 67%
🟢 Test | `functions`: 506 | 45.88M | 37m 51s | 97%
🟢 Realize | `functions`: 235 | 16.02M | 16m 12s | 70%


### `openai/gpt-5.4` - `shopping`

- Source Code: [`openai/gpt-5.4/shopping`](./openai/gpt-5.4/shopping/)
- Score: 100
- Elapsed Time: 2h 38m 15s
- Token Usage: 215.08M
- Function Calling Success Rate: 80.20%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 6 | 3.49M | 46m 42s | 98%
🟢 Database | `namespaces`: 10, `models`: 48 | 4.18M | 4m 22s | 100%
🟢 Interface | `operations`: 168, `schemas`: 198 | 135.33M | 41m 34s | 65%
🟢 Test | `functions`: 551 | 51.19M | 34m 35s | 98%
🟢 Realize | `functions`: 261 | 20.89M | 31m 0s | 80%


### `openai/gpt-5.4` - `erp`

- Source Code: [`openai/gpt-5.4/erp`](./openai/gpt-5.4/erp/)
- Score: 100
- Elapsed Time: 2h 14m 17s
- Token Usage: 166.05M
- Function Calling Success Rate: 81.55%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 2.51M | 37m 53s | 98%
🟢 Database | `namespaces`: 5, `models`: 39 | 3.03M | 3m 20s | 98%
🟢 Interface | `operations`: 154, `schemas`: 158 | 100.65M | 32m 12s | 68%
🟢 Test | `functions`: 446 | 41.05M | 38m 25s | 98%
🟢 Realize | `functions`: 223 | 18.80M | 22m 25s | 78%


## `moonshotai/kimi-k2.5`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./moonshotai/kimi-k2.5/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./moonshotai/kimi-k2.5/reddit/) | 99.64 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./moonshotai/kimi-k2.5/shopping/) | 99.82 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`erp`](./moonshotai/kimi-k2.5/erp/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `moonshotai/kimi-k2.5` - `todo`

- Source Code: [`moonshotai/kimi-k2.5/todo`](./moonshotai/kimi-k2.5/todo/)
- Score: 100
- Elapsed Time: 2h 15m 47s
- Token Usage: 19.53M
- Function Calling Success Rate: 59.20%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 397.8K | 18m 48s | 98%
🟢 Database | `namespaces`: 3, `models`: 7 | 718.3K | 5m 54s | 90%
🟢 Interface | `operations`: 18, `schemas`: 27 | 12.00M | 1h 3m 0s | 62%
🟢 Test | `functions`: 55 | 4.29M | 11m 24s | 88%
🟢 Realize | `functions`: 27 | 2.12M | 36m 39s | 27%


### `moonshotai/kimi-k2.5` - `reddit`

- Source Code: [`moonshotai/kimi-k2.5/reddit`](./moonshotai/kimi-k2.5/reddit/)
- Score: 99.64
- Elapsed Time: 4h 59m 1s
- Token Usage: 111.82M
- Function Calling Success Rate: 64.99%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 6 | 749.3K | 22m 6s | 85%
🟢 Database | `namespaces`: 7, `models`: 35 | 2.78M | 16m 11s | 96%
🟢 Interface | `operations`: 119, `schemas`: 118 | 63.79M | 1h 44m 54s | 81%
🟢 Test | `functions`: 346 | 31.84M | 1h 12m 2s | 50%
🟡 Realize | `functions`: 169, `errors`: 1 | 12.66M | 1h 23m 45s | 62%


### `moonshotai/kimi-k2.5` - `shopping`

- Source Code: [`moonshotai/kimi-k2.5/shopping`](./moonshotai/kimi-k2.5/shopping/)
- Score: 99.82
- Elapsed Time: 10h 44m 10s
- Token Usage: 333.43M
- Function Calling Success Rate: 56.36%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 5, `documents`: 6 | 2.44M | 1h 43m 2s | 81%
🟢 Database | `namespaces`: 8, `models`: 53 | 5.08M | 38m 21s | 31%
🟢 Interface | `operations`: 249, `schemas`: 229 | 175.70M | 2h 56m 39s | 65%
🟢 Test | `functions`: 683 | 104.59M | 2h 32m 18s | 52%
🟡 Realize | `functions`: 342, `errors`: 1 | 45.62M | 2h 53m 47s | 53%


### `moonshotai/kimi-k2.5` - `erp`

- Source Code: [`moonshotai/kimi-k2.5/erp`](./moonshotai/kimi-k2.5/erp/)
- Score: 100
- Elapsed Time: 5h 10m 2s
- Token Usage: 103.08M
- Function Calling Success Rate: 55.48%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.65M | 44m 2s | 85%
🟢 Database | `namespaces`: 7, `models`: 21 | 2.26M | 16m 37s | 97%
🟢 Interface | `operations`: 84, `schemas`: 104 | 62.00M | 1h 41m 35s | 38%
🟢 Test | `functions`: 261 | 25.11M | 1h 0m 5s | 92%
🟢 Realize | `functions`: 131 | 12.07M | 1h 27m 40s | 53%


## `qwen/qwen3.5-122b-a10b`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3.5-122b-a10b/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./qwen/qwen3.5-122b-a10b/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./qwen/qwen3.5-122b-a10b/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`erp`](./qwen/qwen3.5-122b-a10b/erp/) | 98.47 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

### `qwen/qwen3.5-122b-a10b` - `todo`

- Source Code: [`qwen/qwen3.5-122b-a10b/todo`](./qwen/qwen3.5-122b-a10b/todo/)
- Score: 100
- Elapsed Time: 1h 18m 29s
- Token Usage: 18.08M
- Function Calling Success Rate: 88.05%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 377.8K | 4m 1s | 100%
🟢 Database | `namespaces`: 2, `models`: 7 | 1.25M | 34m 2s | 97%
🟢 Interface | `operations`: 14, `schemas`: 28 | 11.65M | 23m 40s | 80%
🟢 Test | `functions`: 44 | 2.90M | 7m 36s | 95%
🟢 Realize | `functions`: 24 | 1.90M | 9m 8s | 86%


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


### `qwen/qwen3.5-122b-a10b` - `erp`

- Source Code: [`qwen/qwen3.5-122b-a10b/erp`](./qwen/qwen3.5-122b-a10b/erp/)
- Score: 98.47
- Elapsed Time: 3h 17m 10s
- Token Usage: 124.76M
- Function Calling Success Rate: 80.86%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.86M | 25m 2s | 99%
🟢 Database | `namespaces`: 7, `models`: 27 | 2.55M | 5m 3s | 97%
🟢 Interface | `operations`: 101, `schemas`: 135 | 89.90M | 1h 31m 11s | 70%
🟢 Test | `functions`: 34 | 6.61M | 10m 15s | 96%
🟡 Realize | `functions`: 157, `errors`: 4 | 23.84M | 1h 5m 37s | 91%


## `qwen/qwen3.5-397b-a17b`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3.5-397b-a17b/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./qwen/qwen3.5-397b-a17b/reddit/) | 98.95 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./qwen/qwen3.5-397b-a17b/shopping/) | 99.76 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`erp`](./qwen/qwen3.5-397b-a17b/erp/) | 99.56 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

### `qwen/qwen3.5-397b-a17b` - `todo`

- Source Code: [`qwen/qwen3.5-397b-a17b/todo`](./qwen/qwen3.5-397b-a17b/todo/)
- Score: 100
- Elapsed Time: 53m 50s
- Token Usage: 18.39M
- Function Calling Success Rate: 91.82%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 419.9K | 9m 56s | 100%
🟢 Database | `namespaces`: 2, `models`: 8 | 686.1K | 3m 45s | 92%
🟢 Interface | `operations`: 19, `schemas`: 27 | 11.66M | 19m 25s | 87%
🟢 Test | `functions`: 55 | 3.80M | 10m 1s | 98%
🟢 Realize | `functions`: 29 | 1.82M | 10m 42s | 87%


### `qwen/qwen3.5-397b-a17b` - `reddit`

- Source Code: [`qwen/qwen3.5-397b-a17b/reddit`](./qwen/qwen3.5-397b-a17b/reddit/)
- Score: 98.95
- Elapsed Time: 2h 57m 13s
- Token Usage: 81.50M
- Function Calling Success Rate: 91.49%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.09M | 27m 2s | 99%
🟢 Database | `namespaces`: 10, `models`: 24 | 2.56M | 26m 31s | 96%
🟢 Interface | `operations`: 70, `schemas`: 86 | 46.20M | 50m 53s | 87%
🟢 Test | `functions`: 228 | 19.14M | 29m 22s | 97%
🟡 Realize | `functions`: 114, `errors`: 2 | 12.51M | 43m 24s | 86%


### `qwen/qwen3.5-397b-a17b` - `shopping`

- Source Code: [`qwen/qwen3.5-397b-a17b/shopping`](./qwen/qwen3.5-397b-a17b/shopping/)
- Score: 99.76
- Elapsed Time: 4h 48m 38s
- Token Usage: 229.80M
- Function Calling Success Rate: 86.95%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 6 | 2.31M | 38m 31s | 100%
🟢 Database | `namespaces`: 11, `models`: 38 | 4.36M | 8m 12s | 93%
🟢 Interface | `operations`: 174, `schemas`: 172 | 133.90M | 1h 46m 26s | 78%
🟢 Test | `functions`: 464 | 63.19M | 1h 33m 55s | 94%
🟡 Realize | `functions`: 248, `errors`: 1 | 26.04M | 41m 33s | 88%


### `qwen/qwen3.5-397b-a17b` - `erp`

- Source Code: [`qwen/qwen3.5-397b-a17b/erp`](./qwen/qwen3.5-397b-a17b/erp/)
- Score: 99.56
- Elapsed Time: 3h 1m 32s
- Token Usage: 121.41M
- Function Calling Success Rate: 87.46%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.14M | 28m 31s | 100%
🟢 Database | `namespaces`: 7, `models`: 20 | 2.07M | 24m 47s | 98%
🟢 Interface | `operations`: 89, `schemas`: 129 | 78.31M | 42m 31s | 79%
🟢 Test | `functions`: 204 | 23.70M | 55m 28s | 96%
🟡 Realize | `functions`: 137, `errors`: 1 | 16.18M | 30m 12s | 91%


## `qwen/qwen3.5-35b-a3b`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3.5-35b-a3b/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./qwen/qwen3.5-35b-a3b/reddit/) | 99.1 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./qwen/qwen3.5-35b-a3b/shopping/) | 99.15 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`erp`](./qwen/qwen3.5-35b-a3b/erp/) | 98.16 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

### `qwen/qwen3.5-35b-a3b` - `todo`

- Source Code: [`qwen/qwen3.5-35b-a3b/todo`](./qwen/qwen3.5-35b-a3b/todo/)
- Score: 100
- Elapsed Time: 52m 23s
- Token Usage: 20.69M
- Function Calling Success Rate: 81.86%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 504.7K | 5m 15s | 92%
🟢 Database | `namespaces`: 2, `models`: 7 | 733.3K | 1m 51s | 84%
🟢 Interface | `operations`: 18, `schemas`: 23 | 12.68M | 14m 57s | 69%
🟢 Test | `functions`: 57 | 4.78M | 7m 19s | 91%
🟢 Realize | `functions`: 25 | 1.99M | 23m 0s | 84%


### `qwen/qwen3.5-35b-a3b` - `reddit`

- Source Code: [`qwen/qwen3.5-35b-a3b/reddit`](./qwen/qwen3.5-35b-a3b/reddit/)
- Score: 99.1
- Elapsed Time: 3h 47m 40s
- Token Usage: 152.98M
- Function Calling Success Rate: 75.09%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.31M | 9m 59s | 93%
🟢 Database | `namespaces`: 10, `models`: 43 | 5.09M | 7m 34s | 80%
🟢 Interface | `operations`: 82, `schemas`: 117 | 85.60M | 1h 36m 16s | 67%
🟢 Test | `functions`: 219 | 34.79M | 34m 4s | 83%
🟡 Realize | `functions`: 133, `errors`: 2 | 26.20M | 1h 19m 45s | 72%


### `qwen/qwen3.5-35b-a3b` - `shopping`

- Source Code: [`qwen/qwen3.5-35b-a3b/shopping`](./qwen/qwen3.5-35b-a3b/shopping/)
- Score: 99.15
- Elapsed Time: 5h 50m 40s
- Token Usage: 331.05M
- Function Calling Success Rate: 77.07%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 5, `documents`: 6 | 2.89M | 20m 19s | 95%
🟢 Database | `namespaces`: 14, `models`: 68 | 9.34M | 27m 14s | 81%
🟢 Interface | `operations`: 196, `schemas`: 217 | 182.49M | 2h 8m 12s | 69%
🟢 Test | `functions`: 462 | 86.27M | 1h 30m 14s | 83%
🟡 Realize | `functions`: 284, `errors`: 4 | 50.06M | 1h 24m 39s | 77%


### `qwen/qwen3.5-35b-a3b` - `erp`

- Source Code: [`qwen/qwen3.5-35b-a3b/erp`](./qwen/qwen3.5-35b-a3b/erp/)
- Score: 98.16
- Elapsed Time: 3h 38m 13s
- Token Usage: 245.44M
- Function Calling Success Rate: 74.76%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.92M | 11m 55s | 91%
🟢 Database | `namespaces`: 8, `models`: 23 | 3.07M | 4m 6s | 76%
🟢 Interface | `operations`: 119, `schemas`: 131 | 113.24M | 57m 15s | 67%
🟢 Test | `functions`: 327 | 82.98M | 1h 27m 1s | 79%
🟡 Realize | `functions`: 163, `errors`: 5 | 44.23M | 57m 54s | 75%


## `z-ai/glm-5`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./z-ai/glm-5/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./z-ai/glm-5/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./z-ai/glm-5/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`erp`](./z-ai/glm-5/erp/) | 45 | 🟢 | 🟢 | 🟡 | ❌ | ❌

### `z-ai/glm-5` - `todo`

- Source Code: [`z-ai/glm-5/todo`](./z-ai/glm-5/todo/)
- Score: 100
- Elapsed Time: 1h 11m 24s
- Token Usage: 18.48M
- Function Calling Success Rate: 93.56%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 357.6K | 9m 7s | 100%
🟢 Database | `namespaces`: 2, `models`: 7 | 940.7K | 7m 23s | 100%
🟢 Interface | `operations`: 20, `schemas`: 26 | 11.10M | 30m 28s | 89%
🟢 Test | `functions`: 66 | 4.27M | 11m 59s | 97%
🟢 Realize | `functions`: 29 | 1.81M | 12m 24s | 90%


### `z-ai/glm-5` - `reddit`

- Source Code: [`z-ai/glm-5/reddit`](./z-ai/glm-5/reddit/)
- Score: 100
- Elapsed Time: 2h 50m 43s
- Token Usage: 77.83M
- Function Calling Success Rate: 90.00%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 859.0K | 33m 32s | 95%
🟢 Database | `namespaces`: 7, `models`: 18 | 2.50M | 18m 3s | 96%
🟢 Interface | `operations`: 58, `schemas`: 60 | 53.03M | 58m 45s | 90%
🟢 Test | `functions`: 183 | 13.17M | 26m 55s | 94%
🟢 Realize | `functions`: 83 | 8.27M | 33m 26s | 78%


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


### `z-ai/glm-5` - `erp`

- Source Code: [`z-ai/glm-5/erp`](./z-ai/glm-5/erp/)
- Score: 45
- Elapsed Time: 1h 27m 17s
- Token Usage: 5.65M
- Function Calling Success Rate: 99.20%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.47M | 1h 3m 58s | 100%
🟢 Database | `namespaces`: 7, `models`: 24 | 4.17M | 23m 19s | 98%
🔴 Interface |  | 3.65M | 0s | 95%
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


## `deepseek/deepseek-v3.2`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./deepseek/deepseek-v3.2/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./deepseek/deepseek-v3.2/reddit/) | 98.45 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./deepseek/deepseek-v3.2/shopping/) | 45 | 🟢 | 🟢 | 🟡 | ❌ | ❌
[`erp`](./deepseek/deepseek-v3.2/erp/) | 20 | 🟢 | 🟡 | ❌ | ❌ | ❌

### `deepseek/deepseek-v3.2` - `todo`

- Source Code: [`deepseek/deepseek-v3.2/todo`](./deepseek/deepseek-v3.2/todo/)
- Score: 100
- Elapsed Time: 2h 26m 33s
- Token Usage: 47.70M
- Function Calling Success Rate: 72.61%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 527.5K | 14m 15s | 100%
🟢 Database | `namespaces`: 3, `models`: 12 | 1.53M | 11m 17s | 96%
🟢 Interface | `operations`: 29, `schemas`: 44 | 30.62M | 1h 10m 59s | 67%
🟢 Test | `functions`: 85 | 7.25M | 22m 45s | 90%
🟢 Realize | `functions`: 46 | 7.77M | 27m 15s | 55%


### `deepseek/deepseek-v3.2` - `reddit`

- Source Code: [`deepseek/deepseek-v3.2/reddit`](./deepseek/deepseek-v3.2/reddit/)
- Score: 98.45
- Elapsed Time: 13h 46m 8s
- Token Usage: 327.59M
- Function Calling Success Rate: 71.25%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 1.08M | 51m 19s | 100%
🟢 Database | `namespaces`: 9, `models`: 71 | 13.89M | 1h 58m 38s | 68%
🟢 Interface | `operations`: 179, `schemas`: 196 | 181.14M | 5h 3m 16s | 70%
🟢 Test | `functions`: 530 | 73.75M | 3h 18m 53s | 81%
🟡 Realize | `functions`: 271, `errors`: 7 | 57.74M | 2h 34m 0s | 59%


### `deepseek/deepseek-v3.2` - `shopping`

- Source Code: [`deepseek/deepseek-v3.2/shopping`](./deepseek/deepseek-v3.2/shopping/)
- Score: 45
- Elapsed Time: 3h 22m 5s
- Token Usage: 25.21M
- Function Calling Success Rate: 78.14%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 2.12M | 41m 21s | 100%
🟢 Database | `namespaces`: 12, `models`: 101 | 23.08M | 2h 40m 43s | 71%
🔴 Interface |  | 82.39M | 0s | 70%
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 


### `deepseek/deepseek-v3.2` - `erp`

- Source Code: [`deepseek/deepseek-v3.2/erp`](./deepseek/deepseek-v3.2/erp/)
- Score: 20
- Elapsed Time: 46m 12s
- Token Usage: 2.08M
- Function Calling Success Rate: 96.49%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 2.08M | 46m 12s | 96%
🔴 Database |  | 58.1K | 0s | 100%
⚪ Interface |  |  |  | 
⚪ Test |  |  |  | 
⚪ Realize |  |  |  | 