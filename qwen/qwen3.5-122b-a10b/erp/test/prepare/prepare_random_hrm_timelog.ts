import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM timelog creation data for E2E testing.
 *
 * Generates a complete IHrmTimelog.ICreate with randomized values representing
 * a discrete work session for time tracking purposes. All fields are test-customizable
 * through the DeepPartial input parameter.
 *
 * - hrm_project_id: Random UUID for project reference
 * - hrm_task_id: Optional UUID or null for task reference
 * - date: Random date-time for when work was performed
 * - duration_minutes: Positive integer representing work duration in minutes
 * - description: Optional text describing the work performed
 * - billable: Boolean indicating whether time is chargeable to clients
 */
export function prepare_random_hrm_timelog(
  input?: DeepPartial<IHrmTimelog.ICreate>,
): IHrmTimelog.ICreate {
  return {
    hrm_project_id:
      input?.hrm_project_id ?? typia.random<string & tags.Format<"uuid">>(),
    hrm_task_id:
      input?.hrm_task_id ??
      (Math.random() < 0.5
        ? null
        : typia.random<string & tags.Format<"uuid">>()),
    date: input?.date ?? typia.random<string & tags.Format<"date-time">>(),
    duration_minutes:
      input?.duration_minutes ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description:
      input?.description ??
      (Math.random() < 0.3
        ? null
        : RandomGenerator.paragraph({
            sentences: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
            >(),
          })),
    billable: input?.billable ?? RandomGenerator.pick([true, false] as const),
  };
}
