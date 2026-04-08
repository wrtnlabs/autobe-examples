import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time track task creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackTask.ICreate with randomized values.
 * Tasks represent discrete units of work that can be assigned to employees,
 * organized with parent-child hierarchy, and tracked through status transitions.
 *
 * All properties are test-customizable via the input parameter. The function
 * generates realistic data including project references, task titles, employee
 * assignments, priority levels, workflow statuses, and effort estimates.
 */
export function prepare_random_hrm_time_track_task(
  input?: DeepPartial<IHrmTimeTrackTask.ICreate> | undefined,
): IHrmTimeTrackTask.ICreate {
  return {
    hrm_time_track_project_id:
      input?.hrm_time_track_project_id ??
      typia.random<string & tags.Format<"uuid">>(),
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    hrm_time_track_employee_id:
      input?.hrm_time_track_employee_id ??
      typia.random<string & tags.Format<"uuid">>(),
    parent_task_id:
      input?.parent_task_id ?? typia.random<string & tags.Format<"uuid">>(),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "medium", "high", "urgent"] as const),
    status:
      input?.status ??
      RandomGenerator.pick([
        "pending",
        "in_progress",
        "review",
        "completed",
      ] as const),
    effort_estimate:
      input?.effort_estimate ??
      typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
  };
}
