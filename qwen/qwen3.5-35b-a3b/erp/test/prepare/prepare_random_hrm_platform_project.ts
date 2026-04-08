import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform project creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformProject.ICreate with randomized values
 * for testing project creation scenarios in the HRM platform.
 */
export function prepare_random_hrm_platform_project(
  input?: DeepPartial<IHrmPlatformProject.ICreate>,
): IHrmPlatformProject.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    color_code:
      input?.color_code ??
      typia.random<string & tags.Pattern<"^#[0-9A-F]{6}$">>(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    budget_hours:
      input?.budget_hours ?? typia.random<number & tags.Minimum<0>>(),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}