import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random task creation data for ERP HRM & Time Tracking Platform E2E testing.
 *
 * Generates a complete IHrmPlatformTask.ICreate with randomized values. The
 * title is generated as a readable paragraph, description as multi-paragraph
 * content. UUID fields (assigned_employee_id, parent_id) are generated using
 * typia.random. Enum fields (status, priority) are randomly selected from
 * their valid values. Numeric and date fields use appropriate typia.random
 * generators.
 *
 * All fields support override via the DeepPartial input parameter for
 * test customization. Fields not provided in input receive random defaults.
 */
export function prepare_random_hrm_platform_task(
  input?: DeepPartial<IHrmPlatformTask.ICreate>,
): IHrmPlatformTask.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    assigned_employee_id:
      input?.assigned_employee_id ??
      typia.random<string & tags.Format<"uuid">>(),
    parent_id: input?.parent_id ?? typia.random<string & tags.Format<"uuid">>(),
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
    estimated_hours: input?.estimated_hours ?? typia.random<number>(),
    due_at: input?.due_at ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
