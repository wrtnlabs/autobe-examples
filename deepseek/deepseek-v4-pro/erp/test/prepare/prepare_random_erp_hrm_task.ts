import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ERP HRM task creation data for E2E testing.
 *
 * Generates a complete IErpHrmTask.ICreate with randomized values for all
 * properties. The title is generated using RandomGenerator.paragraph to
 * produce realistic task names. Optional fields include a multi-paragraph
 * description, a random workflow status, priority level, estimated hours
 * with positive bounds, and a date-time formatted due date.
 *
 * Reference fields for assigned employee and parent task use UUID format.
 * When overridden via DeepPartial input, provided values take precedence
 * over random defaults, allowing tests to pin specific relationships or
 * attributes while keeping other fields random.
 */
export function prepare_random_erp_hrm_task(
  input?: DeepPartial<IErpHrmTask.ICreate>,
): IErpHrmTask.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
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
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<500>
      >(),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
    assigned_employee_id:
      input?.assigned_employee_id ??
      typia.random<string & tags.Format<"uuid">>(),
    parent_task_id:
      input?.parent_task_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
