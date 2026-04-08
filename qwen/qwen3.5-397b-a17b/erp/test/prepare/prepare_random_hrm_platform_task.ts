import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform task creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformTask.ICreate with randomized values for all
 * properties. Required fields (title, priority) are always generated with
 * realistic data. Optional fields (description, status, estimated_hours,
 * due_date, assigned_employee_id, parent_task_id) are generated with sensible
 * defaults when not provided in the input.
 *
 * The function supports partial input override via DeepPartial, allowing tests
 * to customize specific properties while auto-generating the rest. This is
 * useful for testing specific scenarios like high-priority tasks, tasks with
 * assignments, or subtasks with parent references.
 *
 * @param input - Optional partial input to override specific properties
 * @returns Complete IHrmPlatformTask.ICreate object with all required fields
 */
export function prepare_random_hrm_platform_task(
  input?: DeepPartial<IHrmPlatformTask.ICreate>,
): IHrmPlatformTask.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
      }),
    status:
      input?.status ??
      RandomGenerator.pick([
        "open",
        "in-progress",
        "completed",
        "closed",
      ] as const),
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "medium", "high", "urgent"] as const),
    estimated_hours:
      input?.estimated_hours ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
    assigned_employee_id:
      input?.assigned_employee_id ??
      typia.random<string & tags.Format<"uuid">>(),
    parent_task_id:
      input?.parent_task_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
