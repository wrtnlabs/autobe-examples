import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random hrm platform timer creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformTimer.ICreate with randomized values.
 * Both project_id and task_id are optional UUID fields that can be
 * manually specified or auto-generated as random UUIDs.
 */
export function prepare_random_hrm_platform_timer(
  input?: DeepPartial<IHrmPlatformTimer.ICreate> | undefined,
): IHrmPlatformTimer.ICreate {
  return {
    hrm_platform_project_id:
      input?.hrm_platform_project_id ??
      typia.random<string & tags.Format<"uuid">>(),
    hrm_platform_task_id:
      input?.hrm_platform_task_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
