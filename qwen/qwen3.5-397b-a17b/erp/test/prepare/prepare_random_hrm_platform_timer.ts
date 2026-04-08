import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform timer creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformTimer.ICreate with randomized values for starting a new timer session. The function supports partial input overrides through DeepPartial, allowing tests to customize specific fields while auto-generating the rest.
 *
 * The hrm_platform_project_id is required and generated as a UUID. The hrm_platform_task_id and description are optional fields that can be either a value or null, randomly determined when not specified in input.
 *
 * @param input - Optional partial input for customizing specific fields
 * @returns Complete IHrmPlatformTimer.ICreate object for timer creation
 */
export function prepare_random_hrm_platform_timer(
  input?: DeepPartial<IHrmPlatformTimer.ICreate>,
): IHrmPlatformTimer.ICreate {
  return {
    hrm_platform_project_id:
      input?.hrm_platform_project_id ??
      typia.random<string & tags.Format<"uuid">>(),
    hrm_platform_task_id:
      input?.hrm_platform_task_id !== undefined
        ? input.hrm_platform_task_id
        : typia.random<boolean>()
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
    description:
      input?.description !== undefined
        ? input.description
        : typia.random<boolean>()
          ? RandomGenerator.paragraph({ sentences: 2 })
          : null,
  };
}
