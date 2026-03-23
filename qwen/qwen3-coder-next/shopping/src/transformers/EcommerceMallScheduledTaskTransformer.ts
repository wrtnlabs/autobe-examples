import { IEcommerceMallScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallScheduledTaskTransformer {
  export type Payload = Prisma.ecommerce_mall_scheduled_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        cron_expression: true,
        timezone: true,
        next_execution_at: true,
        timeout_seconds: true,
        max_retries: true,
        retry_delay_seconds: true,
        concurrent_policy: true,
        is_active: true,
        status: true,
        last_execution_status: true,
        last_execution_start_at: true,
        last_execution_end_at: true,
        last_execution_duration_seconds: true,
        last_execution_error: true,
        success_count: true,
        failure_count: true,
        last_failed_reason: true,
        last_failed_retry_count: true,
        created_by: true,
        updated_by: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.ecommerce_mall_scheduled_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallScheduledTask> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      cron_expression: input.cron_expression,
      timezone: input.timezone ?? undefined,
      next_execution_at: input.next_execution_at.toISOString(),
      timeout_seconds: input.timeout_seconds ?? undefined,
      max_retries: input.max_retries ?? undefined,
      retry_delay_seconds: input.retry_delay_seconds ?? undefined,
      concurrent_policy: input.concurrent_policy,
      is_active: input.is_active,
      status: input.status,
      last_execution_status: input.last_execution_status ?? undefined,
      last_execution_start_at:
        input.last_execution_start_at?.toISOString() ?? undefined,
      last_execution_end_at:
        input.last_execution_end_at?.toISOString() ?? undefined,
      last_execution_duration_seconds:
        input.last_execution_duration_seconds ?? undefined,
      last_execution_error: input.last_execution_error ?? undefined,
      success_count: input.success_count,
      failure_count: input.failure_count,
      last_failed_reason: input.last_failed_reason ?? undefined,
      last_failed_retry_count: input.last_failed_retry_count ?? undefined,
      created_by: input.created_by ?? undefined,
      updated_by: input.updated_by ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
