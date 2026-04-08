import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform task creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformTask.ICreate with randomized values
 * for task title, optional description, project assignment, and scheduling.
 * Supports input override via DeepPartial parameter for test customization.
 */
export function prepare_random_hrm_platform_task(
  input?: DeepPartial<IHrmPlatformTask.ICreate> | undefined,
): IHrmPlatformTask.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 6,
      }),
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    parent_task_id:
      input?.parent_task_id ?? typia.random<string & tags.Format<"uuid">>(),
    assigned_employee_id:
      input?.assigned_employee_id ??
      typia.random<string & tags.Format<"uuid">>(),
    priority:
      input?.priority ??
      RandomGenerator.pick(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const),
    estimated_hours:
      input?.estimated_hours ?? typia.random<number & tags.Type<"double">>(),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
