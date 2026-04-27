import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time tracking task creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackingTask.ICreate with randomized values.
 * Supports partial overrides via the input parameter for test-time customization.
 *
 * All optional fields default to null when not provided, allowing the server
 * to apply its own default values (e.g., priority defaults to 'medium').
 * The title is the only required field and is always generated with meaningful
 * text content.
 *
 * @param input - Partial overrides for any property
 * @returns A complete IHrmTimeTrackingTask.ICreate instance
 */
export function prepare_random_hrm_time_tracking_task(
  input?: DeepPartial<IHrmTimeTrackingTask.ICreate> | undefined,
): IHrmTimeTrackingTask.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 1 }),
    description: input?.description ?? null,
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "medium", "high", "urgent"] as const),
    estimated_hours: input?.estimated_hours ?? null,
    due_date: input?.due_date ?? null,
    employee_id: input?.employee_id ?? null,
    parent_task_id: input?.parent_task_id ?? null,
  };
}
