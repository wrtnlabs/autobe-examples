import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform timelog creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformTimelog.ICreate with randomized values
 * for recording work sessions, including employee, project, task context,
 * timestamps, duration, description, and billable status.
 */
export function prepare_random_hrm_platform_timelog(
  input?: DeepPartial<IHrmPlatformTimelog.ICreate> | undefined,
): IHrmPlatformTimelog.ICreate {
  return {
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id:
      input?.task_id ?? typia.random<string & tags.Format<"uuid">>() ?? null,
    start_datetime:
      input?.start_datetime ??
      typia.random<string & tags.Format<"date-time">>(),
    end_datetime:
      input?.end_datetime ?? typia.random<string & tags.Format<"date-time">>(),
    duration_minutes:
      input?.duration_minutes ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }) ?? null,
    billable: input?.billable ?? RandomGenerator.pick([true, false]),
  };
}
