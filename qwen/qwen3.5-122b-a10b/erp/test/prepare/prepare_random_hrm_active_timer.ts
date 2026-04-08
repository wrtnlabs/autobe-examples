import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM active timer creation data for E2E testing.
 *
 * Generates a complete IHrmActiveTimer.ICreate with randomized values for testing
 * the live time tracking functionality. The timer session tracks work time against
 * a specific project, with optional task association and work description.
 *
 * - **projectId**: Required UUID of the project to track time against
 * - **taskId**: Optional UUID of a task within the project
 * - **description**: Optional description of the current work activity
 */
export function prepare_random_hrm_active_timer(
  input?: DeepPartial<IHrmActiveTimer.ICreate>,
): IHrmActiveTimer.ICreate {
  return {
    projectId: input?.projectId ?? typia.random<string & tags.Format<"uuid">>(),
    taskId: input?.taskId ?? typia.random<string & tags.Format<"uuid">>(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
