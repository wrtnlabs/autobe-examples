import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform timer creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformTimer.ICreate with randomized values
 * for timer session initialization.
 *
 * - project_id: Random UUID for the work container
 * - task_id: Optional random UUID or null for task-level granularity
 * - description: Optional work context description
 * - billable: Optional billing classification flag
 */
export function prepare_random_hrm_platform_timer(
  input?: DeepPartial<IHrmPlatformTimer.ICreate>,
): IHrmPlatformTimer.ICreate {
  return {
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id:
      (input?.task_id ?? Math.random() > 0.3)
        ? typia.random<string & tags.Format<"uuid">>()
        : null,
    description:
      (input?.description ?? Math.random() > 0.2)
        ? RandomGenerator.paragraph({ sentences: 2 })
        : null,
    billable: input?.billable ?? Math.random() > 0.5,
  };
}
