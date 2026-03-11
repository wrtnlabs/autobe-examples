import { IEcommerceMallScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_scheduled_task(
  input?: DeepPartial<IEcommerceMallScheduledTask.ICreate>,
): IEcommerceMallScheduledTask.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 1 }),
    description: input?.description ?? null,
    cron_expression:
      input?.cron_expression ??
      typia.random<
        string &
          tags.Pattern<"^([0-9]|[1-5][0-9]) ([0-9]|1[0-9]|2[0-3]) ([1-9]|[12][0-9]|3[01]) ([1-9]|1[0-2]) ([0-6])$">
      >(),
    timezone: input?.timezone ?? null,
    next_execution_at:
      input?.next_execution_at ??
      typia.random<string & tags.Format<"date-time">>(),
    timeout_seconds:
      input?.timeout_seconds ??
      (typia.random<
        | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<86400>)
        | null
      >() as
        | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<86400>)
        | null),
    max_retries:
      input?.max_retries ??
      (typia.random<
        | (number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10>)
        | null
      >() as
        | (number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10>)
        | null),
    retry_delay_seconds:
      input?.retry_delay_seconds ??
      (typia.random<
        | (number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<3600>)
        | null
      >() as
        | (number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<3600>)
        | null),
    concurrent_policy:
      input?.concurrent_policy ??
      RandomGenerator.pick(["allow", "deny", "wait"] as const),
    is_active: input?.is_active ?? typia.random<boolean>(),
    status:
      input?.status ??
      RandomGenerator.pick([
        "pending",
        "running",
        "completed",
        "failed",
        "paused",
      ] as const),
    last_execution_status: input?.last_execution_status ?? null,
    last_execution_start_at: input?.last_execution_start_at ?? null,
    last_execution_end_at: input?.last_execution_end_at ?? null,
    last_execution_duration_seconds:
      input?.last_execution_duration_seconds ??
      (typia.random<(number & tags.Minimum<0>) | null>() as
        | (number & tags.Minimum<0>)
        | null),
    last_execution_error: input?.last_execution_error ?? null,
    success_count:
      input?.success_count ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    failure_count:
      input?.failure_count ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    last_failed_reason: input?.last_failed_reason ?? null,
    last_failed_retry_count:
      input?.last_failed_retry_count ??
      (typia.random<
        | (number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10>)
        | null
      >() as
        | (number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10>)
        | null),
    created_by: input?.created_by ?? null,
    updated_by: input?.updated_by ?? null,
  };
}
