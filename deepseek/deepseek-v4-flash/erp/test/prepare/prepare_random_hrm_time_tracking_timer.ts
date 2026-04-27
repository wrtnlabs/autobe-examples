import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time tracking timer creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackingTimer.ICreate with randomized values.
 * The `projectId` is required and generates a valid UUID. Both `taskId` and
 * `description` are optional and nullable, defaulting to random UUID and
 * descriptive paragraph text respectively when not provided.
 *
 * @param input Optional partial input to override specific generated values
 * @returns A complete IHrmTimeTrackingTimer.ICreate with all properties set
 */
export function prepare_random_hrm_time_tracking_timer(
  input?: DeepPartial<IHrmTimeTrackingTimer.ICreate>,
): IHrmTimeTrackingTimer.ICreate {
  return {
    projectId: input?.projectId ?? typia.random<string & tags.Format<"uuid">>(),
    taskId:
      input?.taskId !== undefined
        ? (input.taskId ?? null)
        : typia.random<string & tags.Format<"uuid">>(),
    description:
      input?.description !== undefined
        ? (input.description ?? null)
        : RandomGenerator.paragraph({ sentences: 3 }),
  };
}
