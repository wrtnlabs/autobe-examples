# AutoBe Generated Examples

## Benchmark

AI Model | Success | Score | FCSR | Status 
:--------|---------|------:|-----:|:------:
[`anthropic/claude-sonnet-4.6`](#anthropicclaude-sonnet-46) | 4 | 100 | 82% | 🟢
[`minimax/minimax-m2.7`](#minimaxminimax-m27) | 4 | 100 | 79% | 🟢
[`openai/gpt-5.4`](#openaigpt-54) | 4 | 100 | 80% | 🟢
[`openai/gpt-5.4-mini`](#openaigpt-54-mini) | 4 | 100 | 85% | 🟢
[`openai/gpt-5.4-nano`](#openaigpt-54-nano) | 4 | 100 | 83% | 🟢
[`qwen/qwen3.5-397b-a17b`](#qwenqwen35-397b-a17b) | 4 | 100 | 85% | 🟢
[`qwen/qwen3.5-122b-a10b`](#qwenqwen35-122b-a10b) | 4 | 100 | 87% | 🟢
[`qwen/qwen3.5-35b-a3b`](#qwenqwen35-35b-a3b) | 4 | 100 | 76% | 🟢
[`qwen/qwen3.5-27b`](#qwenqwen35-27b) | 4 | 100 | 80% | 🟢
[`z-ai/glm-5`](#z-aiglm-5) | 4 | 100 | 88% | 🟢
[`moonshotai/kimi-k2.5`](#moonshotaikimi-k25) | 3 | 99.96 | 64% | 🟢

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


## `minimax/minimax-m2.7`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./minimax/minimax-m2.7/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./minimax/minimax-m2.7/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./minimax/minimax-m2.7/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`erp`](./minimax/minimax-m2.7/erp/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `minimax/minimax-m2.7` - `todo`

- Source Code: [`minimax/minimax-m2.7/todo`](./minimax/minimax-m2.7/todo/)
- Score: 100
- Elapsed Time: 1h 24m 41s
- Token Usage: 18.34M
- Function Calling Success Rate: 87.24%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 673.4K | 22m 44s | 96%
🟢 Database | `namespaces`: 2, `models`: 8 | 651.0K | 5m 1s | 96%
🟢 Interface | `operations`: 17, `schemas`: 22 | 11.41M | 34m 53s | 76%
🟢 Test | `functions`: 54 | 4.15M | 12m 4s | 95%
🟢 Realize | `functions`: 24 | 1.46M | 9m 57s | 86%


### `minimax/minimax-m2.7` - `reddit`

- Source Code: [`minimax/minimax-m2.7/reddit`](./minimax/minimax-m2.7/reddit/)
- Score: 100
- Elapsed Time: 4h 10m 9s
- Token Usage: 133.37M
- Function Calling Success Rate: 76.76%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.17M | 33m 30s | 94%
🟢 Database | `namespaces`: 9, `models`: 28 | 2.97M | 11m 30s | 93%
🟢 Interface | `operations`: 99, `schemas`: 113 | 73.37M | 1h 7m 50s | 60%
🟢 Test | `functions`: 303 | 28.16M | 55m 58s | 93%
🟢 Realize | `functions`: 152 | 27.68M | 1h 21m 19s | 84%


### `minimax/minimax-m2.7` - `shopping`

- Source Code: [`minimax/minimax-m2.7/shopping`](./minimax/minimax-m2.7/shopping/)
- Score: 100
- Elapsed Time: 6h 42m 9s
- Token Usage: 451.46M
- Function Calling Success Rate: 82.86%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 5, `documents`: 6 | 3.25M | 1h 30m 24s | 96%
🟢 Database | `namespaces`: 12, `models`: 54 | 6.47M | 11m 9s | 94%
🟢 Interface | `operations`: 279, `schemas`: 264 | 241.74M | 1h 13m 34s | 76%
🟢 Test | `functions`: 856 | 120.59M | 1h 28m 18s | 84%
🟢 Realize | `functions`: 396 | 79.41M | 2h 18m 42s | 89%


### `minimax/minimax-m2.7` - `erp`

- Source Code: [`minimax/minimax-m2.7/erp`](./minimax/minimax-m2.7/erp/)
- Score: 100
- Elapsed Time: 5h 59m 19s
- Token Usage: 221.72M
- Function Calling Success Rate: 73.91%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 1.76M | 51m 18s | 97%
🟢 Database | `namespaces`: 6, `models`: 28 | 3.03M | 9m 3s | 94%
🟢 Interface | `operations`: 129, `schemas`: 158 | 126.26M | 1h 52m 0s | 52%
🟢 Test | `functions`: 401 | 50.62M | 1h 26m 12s | 92%
🟢 Realize | `functions`: 189 | 40.04M | 1h 40m 44s | 89%


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


## `openai/gpt-5.4-mini`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-5.4-mini/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./openai/gpt-5.4-mini/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./openai/gpt-5.4-mini/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`erp`](./openai/gpt-5.4-mini/erp/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `openai/gpt-5.4-mini` - `todo`

- Source Code: [`openai/gpt-5.4-mini/todo`](./openai/gpt-5.4-mini/todo/)
- Score: 100
- Elapsed Time: 24m 46s
- Token Usage: 27.97M
- Function Calling Success Rate: 89.08%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 985.8K | 4m 10s | 95%
🟢 Database | `namespaces`: 2, `models`: 8 | 611.9K | 1m 21s | 80%
🟢 Interface | `operations`: 24, `schemas`: 31 | 18.09M | 9m 5s | 82%
🟢 Test | `functions`: 77 | 4.75M | 4m 55s | 98%
🟢 Realize | `functions`: 34 | 3.53M | 5m 14s | 96%


### `openai/gpt-5.4-mini` - `reddit`

- Source Code: [`openai/gpt-5.4-mini/reddit`](./openai/gpt-5.4-mini/reddit/)
- Score: 100
- Elapsed Time: 42m 40s
- Token Usage: 70.13M
- Function Calling Success Rate: 87.03%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 1.07M | 4m 58s | 99%
🟢 Database | `namespaces`: 6, `models`: 25 | 1.64M | 1m 11s | 97%
🟢 Interface | `operations`: 85, `schemas`: 76 | 40.32M | 8m 53s | 74%
🟢 Test | `functions`: 255 | 19.60M | 19m 9s | 98%
🟢 Realize | `functions`: 118 | 7.50M | 8m 27s | 87%


### `openai/gpt-5.4-mini` - `shopping`

- Source Code: [`openai/gpt-5.4-mini/shopping`](./openai/gpt-5.4-mini/shopping/)
- Score: 100
- Elapsed Time: 1h 34m 55s
- Token Usage: 309.73M
- Function Calling Success Rate: 87.84%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 2.13M | 13m 55s | 98%
🟢 Database | `namespaces`: 17, `models`: 44 | 3.16M | 1m 44s | 91%
🟢 Interface | `operations`: 241, `schemas`: 192 | 186.70M | 18m 50s | 79%
🟢 Test | `functions`: 752 | 68.28M | 41m 49s | 98%
🟢 Realize | `functions`: 332 | 49.46M | 18m 36s | 93%


### `openai/gpt-5.4-mini` - `erp`

- Source Code: [`openai/gpt-5.4-mini/erp`](./openai/gpt-5.4-mini/erp/)
- Score: 100
- Elapsed Time: 2h 5m 29s
- Token Usage: 110.19M
- Function Calling Success Rate: 78.93%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.53M | 15m 30s | 97%
🟢 Database | `namespaces`: 9, `models`: 29 | 1.61M | 1m 15s | 97%
🟢 Interface | `operations`: 114, `schemas`: 127 | 67.32M | 34m 40s | 61%
🟢 Test | `functions`: 366 | 29.56M | 45m 56s | 99%
🟢 Realize | `functions`: 170 | 10.17M | 28m 4s | 89%


## `openai/gpt-5.4-nano`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-5.4-nano/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./openai/gpt-5.4-nano/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./openai/gpt-5.4-nano/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`erp`](./openai/gpt-5.4-nano/erp/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `openai/gpt-5.4-nano` - `todo`

- Source Code: [`openai/gpt-5.4-nano/todo`](./openai/gpt-5.4-nano/todo/)
- Score: 100
- Elapsed Time: 5h 0m 3s
- Token Usage: 66.29M
- Function Calling Success Rate: 90.53%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 2.69M | 24m 54s | 96%
🟢 Database | `namespaces`: 1, `models`: 3 | 883.1K | 2m 22s | 83%
🟢 Interface | `operations`: 23, `schemas`: 28 | 30.04M | 38m 48s | 66%
🟢 Test | `functions`: 69 | 7.96M | 19m 58s | 98%
🟢 Realize | `functions`: 29 | 24.72M | 3h 34m 0s | 97%


### `openai/gpt-5.4-nano` - `reddit`

- Source Code: [`openai/gpt-5.4-nano/reddit`](./openai/gpt-5.4-nano/reddit/)
- Score: 100
- Elapsed Time: 1h 41m 44s
- Token Usage: 123.02M
- Function Calling Success Rate: 82.10%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 1.36M | 7m 27s | 97%
🟢 Database | `namespaces`: 7, `models`: 23 | 1.70M | 1m 22s | 91%
🟢 Interface | `operations`: 126, `schemas`: 98 | 70.97M | 22m 6s | 66%
🟢 Test | `functions`: 369 | 34.64M | 43m 26s | 96%
🟢 Realize | `functions`: 174 | 14.36M | 27m 21s | 88%


### `openai/gpt-5.4-nano` - `shopping`

- Source Code: [`openai/gpt-5.4-nano/shopping`](./openai/gpt-5.4-nano/shopping/)
- Score: 100
- Elapsed Time: 2h 46m 6s
- Token Usage: 203.46M
- Function Calling Success Rate: 80.72%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 3.19M | 45m 22s | 98%
🟢 Database | `namespaces`: 7, `models`: 35 | 2.85M | 1m 56s | 87%
🟢 Interface | `operations`: 185, `schemas`: 159 | 122.62M | 31m 48s | 64%
🟢 Test | `functions`: 575 | 53.61M | 1h 3m 20s | 97%
🟢 Realize | `functions`: 264 | 21.20M | 23m 37s | 86%


### `openai/gpt-5.4-nano` - `erp`

- Source Code: [`openai/gpt-5.4-nano/erp`](./openai/gpt-5.4-nano/erp/)
- Score: 100
- Elapsed Time: 2h 13m 46s
- Token Usage: 149.24M
- Function Calling Success Rate: 78.53%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 2.16M | 17m 18s | 98%
🟢 Database | `namespaces`: 7, `models`: 26 | 2.13M | 1m 54s | 92%
🟢 Interface | `operations`: 122, `schemas`: 131 | 91.12M | 39m 59s | 63%
🟢 Test | `functions`: 362 | 32.73M | 39m 34s | 96%
🟢 Realize | `functions`: 186 | 21.11M | 34m 58s | 82%


## `qwen/qwen3.5-397b-a17b`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3.5-397b-a17b/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./qwen/qwen3.5-397b-a17b/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./qwen/qwen3.5-397b-a17b/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`erp`](./qwen/qwen3.5-397b-a17b/erp/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `qwen/qwen3.5-397b-a17b` - `todo`

- Source Code: [`qwen/qwen3.5-397b-a17b/todo`](./qwen/qwen3.5-397b-a17b/todo/)
- Score: 100
- Elapsed Time: 1h 0m 18s
- Token Usage: 18.18M
- Function Calling Success Rate: 93.68%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.18M | 17m 22s | 99%
🟢 Database | `namespaces`: 2, `models`: 8 | 403.3K | 1m 58s | 100%
🟢 Interface | `operations`: 16, `schemas`: 29 | 10.74M | 16m 48s | 90%
🟢 Test | `functions`: 44 | 2.73M | 8m 43s | 97%
🟢 Realize | `functions`: 25 | 3.12M | 15m 25s | 90%


### `qwen/qwen3.5-397b-a17b` - `reddit`

- Source Code: [`qwen/qwen3.5-397b-a17b/reddit`](./qwen/qwen3.5-397b-a17b/reddit/)
- Score: 100
- Elapsed Time: 2h 22m 32s
- Token Usage: 86.97M
- Function Calling Success Rate: 82.11%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 2.19M | 35m 30s | 100%
🟢 Database | `namespaces`: 2, `models`: 21 | 1.31M | 9m 46s | 98%
🟢 Interface | `operations`: 68, `schemas`: 72 | 52.00M | 35m 47s | 69%
🟢 Test | `functions`: 205 | 17.48M | 26m 12s | 93%
🟢 Realize | `functions`: 102 | 13.98M | 35m 15s | 89%


### `qwen/qwen3.5-397b-a17b` - `shopping`

- Source Code: [`qwen/qwen3.5-397b-a17b/shopping`](./qwen/qwen3.5-397b-a17b/shopping/)
- Score: 100
- Elapsed Time: 4h 10m 19s
- Token Usage: 307.42M
- Function Calling Success Rate: 87.48%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 5, `documents`: 6 | 5.61M | 1h 4m 0s | 97%
🟢 Database | `namespaces`: 11, `models`: 53 | 4.84M | 7m 29s | 98%
🟢 Interface | `operations`: 221, `schemas`: 207 | 162.46M | 57m 45s | 80%
🟢 Test | `functions`: 644 | 80.31M | 1h 14m 55s | 94%
🟢 Realize | `functions`: 315 | 54.20M | 46m 8s | 88%


### `qwen/qwen3.5-397b-a17b` - `erp`

- Source Code: [`qwen/qwen3.5-397b-a17b/erp`](./qwen/qwen3.5-397b-a17b/erp/)
- Score: 100
- Elapsed Time: 3h 58m 13s
- Token Usage: 136.11M
- Function Calling Success Rate: 81.37%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 4.54M | 1h 18m 5s | 98%
🟢 Database | `namespaces`: 8, `models`: 24 | 1.96M | 3m 36s | 98%
🟢 Interface | `operations`: 83, `schemas`: 114 | 81.87M | 1h 3m 52s | 67%
🟢 Test | `functions`: 255 | 23.93M | 50m 30s | 93%
🟢 Realize | `functions`: 130 | 23.80M | 42m 9s | 87%


## `qwen/qwen3.5-122b-a10b`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3.5-122b-a10b/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./qwen/qwen3.5-122b-a10b/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./qwen/qwen3.5-122b-a10b/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`erp`](./qwen/qwen3.5-122b-a10b/erp/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `qwen/qwen3.5-122b-a10b` - `todo`

- Source Code: [`qwen/qwen3.5-122b-a10b/todo`](./qwen/qwen3.5-122b-a10b/todo/)
- Score: 100
- Elapsed Time: 1h 24m 39s
- Token Usage: 28.89M
- Function Calling Success Rate: 93.74%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.44M | 18m 22s | 97%
🟢 Database | `namespaces`: 2, `models`: 8 | 471.2K | 1m 49s | 92%
🟢 Interface | `operations`: 28, `schemas`: 37 | 16.40M | 37m 8s | 90%
🟢 Test | `functions`: 83 | 5.15M | 12m 25s | 97%
🟢 Realize | `functions`: 43 | 5.43M | 14m 54s | 93%


### `qwen/qwen3.5-122b-a10b` - `reddit`

- Source Code: [`qwen/qwen3.5-122b-a10b/reddit`](./qwen/qwen3.5-122b-a10b/reddit/)
- Score: 100
- Elapsed Time: 3h 26m 40s
- Token Usage: 101.41M
- Function Calling Success Rate: 87.32%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 2.56M | 34m 11s | 97%
🟢 Database | `namespaces`: 2, `models`: 18 | 1.28M | 6m 4s | 86%
🟢 Interface | `operations`: 82, `schemas`: 86 | 59.30M | 54m 30s | 76%
🟢 Test | `functions`: 239 | 19.29M | 53m 42s | 95%
🟢 Realize | `functions`: 120 | 18.98M | 58m 12s | 97%


### `qwen/qwen3.5-122b-a10b` - `shopping`

- Source Code: [`qwen/qwen3.5-122b-a10b/shopping`](./qwen/qwen3.5-122b-a10b/shopping/)
- Score: 100
- Elapsed Time: 4h 30m 27s
- Token Usage: 254.07M
- Function Calling Success Rate: 87.60%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 3.64M | 33m 21s | 97%
🟢 Database | `namespaces`: 8, `models`: 44 | 3.47M | 12m 56s | 97%
🟢 Interface | `operations`: 189, `schemas`: 199 | 144.70M | 1h 22m 28s | 78%
🟢 Test | `functions`: 538 | 54.62M | 56m 39s | 96%
🟢 Realize | `functions`: 274 | 47.65M | 1h 25m 1s | 92%


### `qwen/qwen3.5-122b-a10b` - `erp`

- Source Code: [`qwen/qwen3.5-122b-a10b/erp`](./qwen/qwen3.5-122b-a10b/erp/)
- Score: 100
- Elapsed Time: 4h 29m 56s
- Token Usage: 194.43M
- Function Calling Success Rate: 85.10%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 2.21M | 22m 19s | 97%
🟢 Database | `namespaces`: 9, `models`: 27 | 2.05M | 7m 12s | 94%
🟢 Interface | `operations`: 125, `schemas`: 159 | 119.99M | 1h 33m 29s | 76%
🟢 Test | `functions`: 355 | 30.72M | 1h 4m 4s | 94%
🟢 Realize | `functions`: 182 | 39.45M | 1h 22m 49s | 93%


## `qwen/qwen3.5-35b-a3b`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3.5-35b-a3b/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./qwen/qwen3.5-35b-a3b/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./qwen/qwen3.5-35b-a3b/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`erp`](./qwen/qwen3.5-35b-a3b/erp/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `qwen/qwen3.5-35b-a3b` - `todo`

- Source Code: [`qwen/qwen3.5-35b-a3b/todo`](./qwen/qwen3.5-35b-a3b/todo/)
- Score: 100
- Elapsed Time: 1h 35m 22s
- Token Usage: 33.22M
- Function Calling Success Rate: 83.84%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.59M | 18m 11s | 97%
🟢 Database | `namespaces`: 2, `models`: 8 | 581.6K | 2m 5s | 90%
🟢 Interface | `operations`: 27, `schemas`: 37 | 19.30M | 30m 26s | 76%
🟢 Test | `functions`: 81 | 7.01M | 17m 50s | 85%
🟢 Realize | `functions`: 41 | 4.73M | 26m 47s | 82%


### `qwen/qwen3.5-35b-a3b` - `reddit`

- Source Code: [`qwen/qwen3.5-35b-a3b/reddit`](./qwen/qwen3.5-35b-a3b/reddit/)
- Score: 100
- Elapsed Time: 2h 17m 14s
- Token Usage: 136.05M
- Function Calling Success Rate: 76.28%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 1.78M | 15m 53s | 95%
🟢 Database | `namespaces`: 5, `models`: 26 | 2.14M | 5m 46s | 91%
🟢 Interface | `operations`: 100, `schemas`: 113 | 77.68M | 47m 25s | 68%
🟢 Test | `functions`: 284 | 29.17M | 39m 5s | 83%
🟢 Realize | `functions`: 151 | 25.27M | 29m 2s | 77%


### `qwen/qwen3.5-35b-a3b` - `shopping`

- Source Code: [`qwen/qwen3.5-35b-a3b/shopping`](./qwen/qwen3.5-35b-a3b/shopping/)
- Score: 100
- Elapsed Time: 6h 9m 32s
- Token Usage: 361.15M
- Function Calling Success Rate: 76.20%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 5, `documents`: 6 | 3.63M | 37m 45s | 98%
🟢 Database | `namespaces`: 8, `models`: 59 | 5.32M | 11m 48s | 86%
🟢 Interface | `operations`: 227, `schemas`: 232 | 212.60M | 2h 40m 51s | 64%
🟢 Test | `functions`: 634 | 79.95M | 1h 20m 54s | 87%
🟢 Realize | `functions`: 336 | 59.65M | 1h 18m 12s | 80%


### `qwen/qwen3.5-35b-a3b` - `erp`

- Source Code: [`qwen/qwen3.5-35b-a3b/erp`](./qwen/qwen3.5-35b-a3b/erp/)
- Score: 100
- Elapsed Time: 6h 39m 13s
- Token Usage: 214.29M
- Function Calling Success Rate: 76.52%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 4.64M | 50m 57s | 97%
🟢 Database | `namespaces`: 7, `models`: 29 | 3.60M | 13m 22s | 86%
🟢 Interface | `operations`: 115, `schemas`: 159 | 111.38M | 2h 11m 13s | 66%
🟢 Test | `functions`: 336 | 41.72M | 56m 40s | 85%
🟢 Realize | `functions`: 186 | 52.95M | 2h 26m 59s | 76%


## `qwen/qwen3.5-27b`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3.5-27b/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./qwen/qwen3.5-27b/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./qwen/qwen3.5-27b/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`erp`](./qwen/qwen3.5-27b/erp/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

### `qwen/qwen3.5-27b` - `todo`

- Source Code: [`qwen/qwen3.5-27b/todo`](./qwen/qwen3.5-27b/todo/)
- Score: 100
- Elapsed Time: 2h 32m 55s
- Token Usage: 21.45M
- Function Calling Success Rate: 88.12%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 767.2K | 24m 58s | 100%
🟢 Database | `namespaces`: 2, `models`: 7 | 422.3K | 3m 41s | 91%
🟢 Interface | `operations`: 22, `schemas`: 32 | 12.75M | 1h 0m 20s | 83%
🟢 Test | `functions`: 62 | 3.74M | 21m 56s | 94%
🟢 Realize | `functions`: 33 | 3.77M | 41m 58s | 85%


### `qwen/qwen3.5-27b` - `reddit`

- Source Code: [`qwen/qwen3.5-27b/reddit`](./qwen/qwen3.5-27b/reddit/)
- Score: 100
- Elapsed Time: 5h 57m 24s
- Token Usage: 107.12M
- Function Calling Success Rate: 80.73%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 2.88M | 1h 14m 31s | 97%
🟢 Database | `namespaces`: 6, `models`: 22 | 1.67M | 32m 3s | 90%
🟢 Interface | `operations`: 88, `schemas`: 102 | 62.09M | 1h 38m 42s | 71%
🟢 Test | `functions`: 254 | 21.49M | 57m 44s | 87%
🟢 Realize | `functions`: 136 | 18.99M | 1h 34m 23s | 83%


### `qwen/qwen3.5-27b` - `shopping`

- Source Code: [`qwen/qwen3.5-27b/shopping`](./qwen/qwen3.5-27b/shopping/)
- Score: 100
- Elapsed Time: 9h 15m 29s
- Token Usage: 265.56M
- Function Calling Success Rate: 81.60%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 6 | 4.19M | 1h 11m 41s | 98%
🟢 Database | `namespaces`: 10, `models`: 53 | 4.33M | 18m 43s | 89%
🟢 Interface | `operations`: 176, `schemas`: 200 | 150.40M | 2h 48m 9s | 77%
🟢 Test | `functions`: 504 | 55.49M | 2h 9m 29s | 92%
🟢 Realize | `functions`: 267 | 51.16M | 2h 47m 25s | 75%


### `qwen/qwen3.5-27b` - `erp`

- Source Code: [`qwen/qwen3.5-27b/erp`](./qwen/qwen3.5-27b/erp/)
- Score: 100
- Elapsed Time: 5h 59m 29s
- Token Usage: 148.39M
- Function Calling Success Rate: 78.38%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 2.60M | 56m 38s | 99%
🟢 Database | `namespaces`: 5, `models`: 27 | 2.61M | 12m 38s | 88%
🟢 Interface | `operations`: 101, `schemas`: 139 | 89.18M | 2h 4m 39s | 70%
🟢 Test | `functions`: 284 | 26.71M | 1h 9m 4s | 83%
🟢 Realize | `functions`: 163 | 27.28M | 1h 36m 27s | 82%


## `z-ai/glm-5`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./z-ai/glm-5/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./z-ai/glm-5/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./z-ai/glm-5/shopping/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`erp`](./z-ai/glm-5/erp/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢

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
- Score: 100
- Elapsed Time: 5h 11m 55s
- Token Usage: 349.57M
- Function Calling Success Rate: 90.77%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.73M | 1h 5m 11s | 96%
🟢 Database | `namespaces`: 10, `models`: 21 | 4.06M | 22m 27s | 92%
🟢 Interface | `operations`: 92, `schemas`: 124 | 303.84M | 2h 5m 16s | 88%
🟢 Test | `functions`: 281 | 25.15M | 57m 51s | 95%
🟢 Realize | `functions`: 140 | 14.80M | 41m 8s | 88%


## `moonshotai/kimi-k2.5`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./moonshotai/kimi-k2.5/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./moonshotai/kimi-k2.5/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./moonshotai/kimi-k2.5/shopping/) | 99.83 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
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
- Score: 100
- Elapsed Time: 8h 47m 16s
- Token Usage: 117.52M
- Function Calling Success Rate: 67.12%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 6 | 749.3K | 22m 6s | 85%
🟢 Database | `namespaces`: 7, `models`: 35 | 2.78M | 16m 11s | 96%
🟢 Interface | `operations`: 119, `schemas`: 118 | 63.79M | 1h 44m 54s | 81%
🟢 Test | `functions`: 346 | 31.84M | 1h 12m 2s | 50%
🟢 Realize | `functions`: 169 | 18.35M | 5h 12m 0s | 75%


### `moonshotai/kimi-k2.5` - `shopping`

- Source Code: [`moonshotai/kimi-k2.5/shopping`](./moonshotai/kimi-k2.5/shopping/)
- Score: 99.83
- Elapsed Time: 31h 31m 49s
- Token Usage: 322.62M
- Function Calling Success Rate: 68.18%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 5, `documents`: 6 | 2.44M | 1h 43m 2s | 81%
🟢 Database | `namespaces`: 8, `models`: 53 | 5.08M | 38m 21s | 31%
🟢 Interface | `operations`: 259, `schemas`: 207 | 176.24M | 10h 47m 34s | 63%
🟢 Test | `functions`: 709 | 98.95M | 6h 33m 12s | 74%
🟡 Realize | `functions`: 346, `errors`: 1 | 39.91M | 11h 49m 37s | 77%


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