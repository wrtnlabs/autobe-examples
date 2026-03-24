# AutoBe Generated Examples

## Benchmark

AI Model | Success | Score | FCSR | Status 
:--------|---------|------:|-----:|:------:
[`anthropic/claude-sonnet-4.6`](#anthropicclaude-sonnet-46) | 4 | 100 | 82% | 🟢
[`openai/gpt-5.4`](#openaigpt-54) | 4 | 100 | 80% | 🟢
[`z-ai/glm-5`](#z-aiglm-5) | 4 | 100 | 88% | 🟢
[`moonshotai/kimi-k2.5`](#moonshotaikimi-k25) | 2 | 99.87 | 58% | 🟡
[`qwen/qwen3.5-27b`](#qwenqwen35-27b) | 2 | 99.86 | 82% | 🟡
[`openai/gpt-5.4-nano`](#openaigpt-54-nano) | 2 | 99.86 | 80% | 🟡
[`qwen/qwen3.5-122b-a10b`](#qwenqwen35-122b-a10b) | 3 | 99.62 | 84% | 🟢
[`qwen/qwen3.5-397b-a17b`](#qwenqwen35-397b-a17b) | 1 | 99.57 | 88% | 🟡
[`openai/gpt-5.4-mini`](#openaigpt-54-mini) | 2 | 99.2 | 86% | 🟡
[`qwen/qwen3.5-35b-a3b`](#qwenqwen35-35b-a3b) | 1 | 99.1 | 76% | 🟡
[`qwen/qwen3-coder-next`](#qwenqwen3-coder-next) | 1 | 99.02 | 66% | 🟡
[`minimax/minimax-m2.7`](#minimaxminimax-m27) | 1 | 98.01 | 78% | 🟡
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


## `qwen/qwen3.5-27b`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3.5-27b/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./qwen/qwen3.5-27b/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./qwen/qwen3.5-27b/shopping/) | 99.73 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`erp`](./qwen/qwen3.5-27b/erp/) | 99.71 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

### `qwen/qwen3.5-27b` - `todo`

- Source Code: [`qwen/qwen3.5-27b/todo`](./qwen/qwen3.5-27b/todo/)
- Score: 100
- Elapsed Time: 1h 39m 57s
- Token Usage: 18.72M
- Function Calling Success Rate: 86.99%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 874.9K | 25m 58s | 95%
🟢 Database | `namespaces`: 2, `models`: 8 | 901.8K | 6m 31s | 84%
🟢 Interface | `operations`: 18, `schemas`: 24 | 9.71M | 39m 48s | 89%
🟢 Test | `functions`: 56 | 4.86M | 13m 55s | 89%
🟢 Realize | `functions`: 26 | 2.37M | 13m 43s | 72%


### `qwen/qwen3.5-27b` - `reddit`

- Source Code: [`qwen/qwen3.5-27b/reddit`](./qwen/qwen3.5-27b/reddit/)
- Score: 100
- Elapsed Time: 5h 30m 23s
- Token Usage: 119.68M
- Function Calling Success Rate: 78.19%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 1.85M | 1h 0m 49s | 90%
🟢 Database | `namespaces`: 7, `models`: 22 | 3.23M | 16m 45s | 79%
🟢 Interface | `operations`: 91, `schemas`: 102 | 69.35M | 2h 18m 44s | 74%
🟢 Test | `functions`: 269 | 29.22M | 56m 46s | 90%
🟢 Realize | `functions`: 131 | 16.03M | 57m 18s | 64%


### `qwen/qwen3.5-27b` - `shopping`

- Source Code: [`qwen/qwen3.5-27b/shopping`](./qwen/qwen3.5-27b/shopping/)
- Score: 99.73
- Elapsed Time: 8h 8m 3s
- Token Usage: 229.42M
- Function Calling Success Rate: 84.89%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 4, `documents`: 6 | 4.76M | 1h 39m 23s | 95%
🟢 Database | `namespaces`: 10, `models`: 30 | 4.97M | 19m 34s | 88%
🟢 Interface | `operations`: 171, `schemas`: 174 | 125.27M | 2h 35m 33s | 84%
🟢 Test | `functions`: 476 | 60.66M | 1h 36m 59s | 93%
🟡 Realize | `functions`: 225, `errors`: 1 | 33.77M | 1h 56m 33s | 71%


### `qwen/qwen3.5-27b` - `erp`

- Source Code: [`qwen/qwen3.5-27b/erp`](./qwen/qwen3.5-27b/erp/)
- Score: 99.71
- Elapsed Time: 8h 20m 10s
- Token Usage: 191.37M
- Function Calling Success Rate: 81.09%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 1.79M | 36m 57s | 92%
🟢 Database | `namespaces`: 8, `models`: 32 | 4.73M | 22m 39s | 88%
🟢 Interface | `operations`: 145, `schemas`: 162 | 113.42M | 3h 0m 9s | 75%
🟢 Test | `functions`: 424 | 43.73M | 2h 7m 14s | 89%
🟡 Realize | `functions`: 208, `errors`: 1 | 27.68M | 2h 13m 10s | 76%


## `openai/gpt-5.4-nano`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-5.4-nano/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./openai/gpt-5.4-nano/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./openai/gpt-5.4-nano/shopping/) | 99.77 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`erp`](./openai/gpt-5.4-nano/erp/) | 99.68 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

### `openai/gpt-5.4-nano` - `todo`

- Source Code: [`openai/gpt-5.4-nano/todo`](./openai/gpt-5.4-nano/todo/)
- Score: 100
- Elapsed Time: 32m 8s
- Token Usage: 38.41M
- Function Calling Success Rate: 79.65%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 2.12M | 11m 48s | 95%
🟢 Database | `namespaces`: 3, `models`: 11 | 758.0K | 42s | 86%
🟢 Interface | `operations`: 35, `schemas`: 42 | 25.22M | 6m 41s | 66%
🟢 Test | `functions`: 94 | 6.76M | 7m 35s | 95%
🟢 Realize | `functions`: 53 | 3.55M | 5m 19s | 87%


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
- Score: 99.77
- Elapsed Time: 2h 54m 31s
- Token Usage: 205.00M
- Function Calling Success Rate: 80.69%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 3.19M | 45m 22s | 98%
🟢 Database | `namespaces`: 7, `models`: 35 | 2.85M | 1m 56s | 87%
🟢 Interface | `operations`: 185, `schemas`: 159 | 122.62M | 31m 48s | 64%
🟢 Test | `functions`: 575 | 53.61M | 1h 3m 20s | 97%
🟡 Realize | `functions`: 263, `errors`: 1 | 22.74M | 32m 3s | 86%


### `openai/gpt-5.4-nano` - `erp`

- Source Code: [`openai/gpt-5.4-nano/erp`](./openai/gpt-5.4-nano/erp/)
- Score: 99.68
- Elapsed Time: 2h 23m 7s
- Token Usage: 147.33M
- Function Calling Success Rate: 78.26%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 2.16M | 17m 18s | 98%
🟢 Database | `namespaces`: 7, `models`: 26 | 2.13M | 1m 54s | 92%
🟢 Interface | `operations`: 122, `schemas`: 131 | 91.12M | 39m 59s | 63%
🟢 Test | `functions`: 362 | 32.73M | 39m 34s | 96%
🟡 Realize | `functions`: 186, `errors`: 1 | 19.19M | 44m 19s | 81%


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


## `openai/gpt-5.4-mini`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./openai/gpt-5.4-mini/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./openai/gpt-5.4-mini/reddit/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`shopping`](./openai/gpt-5.4-mini/shopping/) | 99.01 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`erp`](./openai/gpt-5.4-mini/erp/) | 97.79 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

### `openai/gpt-5.4-mini` - `todo`

- Source Code: [`openai/gpt-5.4-mini/todo`](./openai/gpt-5.4-mini/todo/)
- Score: 100
- Elapsed Time: 15m 56s
- Token Usage: 23.12M
- Function Calling Success Rate: 97.28%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 636.6K | 3m 37s | 98%
🟢 Database | `namespaces`: 4, `models`: 9 | 583.0K | 40s | 96%
🟢 Interface | `operations`: 32, `schemas`: 40 | 13.16M | 3m 47s | 93%
🟢 Test | `functions`: 92 | 6.05M | 3m 2s | 99%
🟢 Realize | `functions`: 48 | 2.69M | 4m 48s | 100%


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
- Score: 99.01
- Elapsed Time: 1h 30m 28s
- Token Usage: 182.74M
- Function Calling Success Rate: 84.20%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 2.54M | 11m 34s | 98%
🟢 Database | `namespaces`: 10, `models`: 44 | 3.56M | 1m 32s | 96%
🟢 Interface | `operations`: 164, `schemas`: 165 | 107.68M | 14m 32s | 69%
🟢 Test | `functions`: 482 | 46.28M | 38m 42s | 97%
🟡 Realize | `functions`: 242, `errors`: 4 | 22.68M | 24m 6s | 89%


### `openai/gpt-5.4-mini` - `erp`

- Source Code: [`openai/gpt-5.4-mini/erp`](./openai/gpt-5.4-mini/erp/)
- Score: 97.79
- Elapsed Time: 1h 14m 15s
- Token Usage: 122.13M
- Function Calling Success Rate: 85.16%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.84M | 7m 19s | 100%
🟢 Database | `namespaces`: 6, `models`: 25 | 2.08M | 1m 27s | 94%
🟢 Interface | `operations`: 111, `schemas`: 129 | 73.49M | 16m 1s | 73%
🟢 Test | `functions`: 317 | 26.61M | 24m 29s | 96%
🟡 Realize | `functions`: 163, `errors`: 6 | 18.11M | 24m 57s | 90%


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


## `qwen/qwen3-coder-next`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./qwen/qwen3-coder-next/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./qwen/qwen3-coder-next/reddit/) | 99.06 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./qwen/qwen3-coder-next/shopping/) | 98.39 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`erp`](./qwen/qwen3-coder-next/erp/) | 98.62 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

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


### `qwen/qwen3-coder-next` - `erp`

- Source Code: [`qwen/qwen3-coder-next/erp`](./qwen/qwen3-coder-next/erp/)
- Score: 98.62
- Elapsed Time: 4h 1m 26s
- Token Usage: 139.98M
- Function Calling Success Rate: 60.01%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 2.14M | 29m 36s | 96%
🟢 Database | `namespaces`: 7, `models`: 31 | 3.37M | 11m 38s | 87%
🟢 Interface | `operations`: 84, `schemas`: 105 | 92.02M | 1h 28m 28s | 54%
🟢 Test | `functions`: 222 | 24.37M | 56m 28s | 47%
🟡 Realize | `functions`: 130, `errors`: 3 | 18.09M | 55m 14s | 85%


## `minimax/minimax-m2.7`

Project | Score | Analyze | Prisma | Interface | Test | Realize
:-------|------:|:-------:|:------:|:----------|:----:|:-------:
[`todo`](./minimax/minimax-m2.7/todo/) | 100 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢
[`reddit`](./minimax/minimax-m2.7/reddit/) | 96.31 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`shopping`](./minimax/minimax-m2.7/shopping/) | 97.86 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡
[`erp`](./minimax/minimax-m2.7/erp/) | 97.87 | 🟢 | 🟢 | 🟢 | 🟢 | 🟡

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
- Score: 96.31
- Elapsed Time: 3h 41m 9s
- Token Usage: 116.13M
- Function Calling Success Rate: 81.47%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 2, `documents`: 6 | 1.17M | 33m 30s | 94%
🟢 Database | `namespaces`: 9, `models`: 28 | 2.97M | 11m 30s | 93%
🟢 Interface | `operations`: 91, `schemas`: 90 | 66.71M | 51m 20s | 73%
🟢 Test | `functions`: 277 | 26.02M | 34m 49s | 93%
🟡 Realize | `functions`: 130, `errors`: 8 | 19.26M | 1h 29m 59s | 75%


### `minimax/minimax-m2.7` - `shopping`

- Source Code: [`minimax/minimax-m2.7/shopping`](./minimax/minimax-m2.7/shopping/)
- Score: 97.86
- Elapsed Time: 7h 10m 24s
- Token Usage: 342.22M
- Function Calling Success Rate: 77.40%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 5, `documents`: 6 | 3.25M | 1h 30m 24s | 96%
🟢 Database | `namespaces`: 12, `models`: 54 | 6.47M | 11m 9s | 94%
🟢 Interface | `operations`: 209, `schemas`: 214 | 199.33M | 1h 35m 43s | 66%
🟢 Test | `functions`: 619 | 86.95M | 1h 46m 16s | 88%
🟡 Realize | `functions`: 308, `errors`: 11 | 46.22M | 2h 6m 50s | 76%


### `minimax/minimax-m2.7` - `erp`

- Source Code: [`minimax/minimax-m2.7/erp`](./minimax/minimax-m2.7/erp/)
- Score: 97.87
- Elapsed Time: 4h 20m 55s
- Token Usage: 200.92M
- Function Calling Success Rate: 77.52%

Phase | Generated | Token Usage | Elapsed Time | FCSR
:-----|:----------|------------:|-------------:|------:
🟢 Analyze | `actors`: 3, `documents`: 6 | 1.76M | 51m 18s | 97%
🟢 Database | `namespaces`: 6, `models`: 28 | 3.03M | 9m 3s | 94%
🟢 Interface | `operations`: 143, `schemas`: 131 | 118.88M | 58m 45s | 64%
🟢 Test | `functions`: 426 | 47.36M | 54m 34s | 91%
🟡 Realize | `functions`: 197, `errors`: 7 | 29.89M | 1h 27m 13s | 77%


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