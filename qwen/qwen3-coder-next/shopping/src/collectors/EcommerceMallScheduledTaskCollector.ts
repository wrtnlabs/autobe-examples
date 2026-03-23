import { IEcommerceMallScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallScheduledTaskCollector {
  export async function collect(props: {
    body: IEcommerceMallScheduledTask.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      cron_expression: props.body.cron_expression,
      timezone: props.body.timezone ?? null,
      next_execution_at: new Date(props.body.next_execution_at),
      timeout_seconds: props.body.timeout_seconds ?? null,
      max_retries: props.body.max_retries ?? null,
      retry_delay_seconds: props.body.retry_delay_seconds ?? null,
      concurrent_policy: props.body.concurrent_policy,
      is_active: props.body.is_active,
      status: props.body.status,
      last_execution_status: props.body.last_execution_status ?? null,
      last_execution_start_at: props.body.last_execution_start_at
        ? new Date(props.body.last_execution_start_at)
        : null,
      last_execution_end_at: props.body.last_execution_end_at
        ? new Date(props.body.last_execution_end_at)
        : null,
      last_execution_duration_seconds:
        props.body.last_execution_duration_seconds ?? null,
      last_execution_error: props.body.last_execution_error ?? null,
      success_count: props.body.success_count ?? 0,
      failure_count: props.body.failure_count ?? 0,
      last_failed_reason: props.body.last_failed_reason ?? null,
      last_failed_retry_count: props.body.last_failed_retry_count ?? null,
      created_by: props.body.created_by ?? null,
      updated_by: props.body.updated_by ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.ecommerce_mall_scheduled_tasksCreateInput;
  }
}
