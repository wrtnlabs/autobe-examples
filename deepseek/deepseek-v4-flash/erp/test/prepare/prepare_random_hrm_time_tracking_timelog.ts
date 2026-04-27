import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time tracking timelog creation data for E2E testing.
 *
 * Generates a complete {@link IHrmTimeTrackingTimelog.ICreate} payload with
 * randomized values for all fields. The authenticated employee is inferred
 * from the session, so no employee reference is required in the input.
 *
 * All properties support test-time override via the optional
 * `DeepPartial<ICreate>` input, allowing selective customization while
 * defaulting to realistic random data.
 *
 * @param input - Partial input to override specific generated values
 * @returns A complete timelog creation payload
 */
export function prepare_random_hrm_time_tracking_timelog(
  input?: DeepPartial<IHrmTimeTrackingTimelog.ICreate> | undefined,
): IHrmTimeTrackingTimelog.ICreate {
  return {
    date: input?.date ?? typia.random<string & tags.Format<"date-time">>(),
    duration_minutes:
      input?.duration_minutes ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id:
      input?.task_id !== undefined
        ? input.task_id
        : Math.random() > 0.5
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
    description:
      input?.description !== undefined
        ? input.description
        : Math.random() > 0.5
          ? RandomGenerator.paragraph({ sentences: 2 })
          : null,
    billable: input?.billable ?? true,
  };
}
