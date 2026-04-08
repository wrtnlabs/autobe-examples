import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM task creation data for E2E testing.
 *
 * Generates a complete IHrmTask.ICreate with randomized values for task management testing.
 * Supports all optional fields including description, employee assignment, parent task nesting,
 * status, time estimation, and due dates.
 *
 * @param input Optional partial input to override specific properties
 * @returns Complete IHrmTask.ICreate object with all required and optional fields
 */
export function prepare_random_hrm_task(
  input?: DeepPartial<IHrmTask.ICreate>,
): IHrmTask.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 2 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "medium", "high", "urgent"] as const),
    assigned_employee_id:
      input?.assigned_employee_id ??
      typia.random<string & tags.Format<"uuid">>(),
    parent_task_id:
      input?.parent_task_id ?? typia.random<string & tags.Format<"uuid">>(),
    status:
      input?.status ??
      RandomGenerator.pick([
        "open",
        "in-progress",
        "completed",
        "closed",
      ] as const),
    estimated_hours:
      input?.estimated_hours ??
      typia.random<
        number & tags.Type<"double"> & tags.Minimum<0.5> & tags.Maximum<40>
      >(),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
