import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform project creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformProject.ICreate with randomized values including
 * project name, hex color code, optional description, budget, and date range.
 */
export function prepare_random_hrm_platform_project(
  input?: DeepPartial<IHrmPlatformProject.ICreate>,
): IHrmPlatformProject.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 1 }),
    color_code: input?.color_code ?? `#FF${RandomGenerator.alphabets(4)}`,
    description:
      input?.description ??
      (Math.random() > 0.3 ? RandomGenerator.content({ paragraphs: 2 }) : null),
    budget:
      input?.budget ??
      (Math.random() > 0.3
        ? typia.random<number & tags.Type<"uint32">>()
        : null),
    start_date:
      input?.start_date ??
      (Math.random() > 0.3
        ? RandomGenerator.date(
            new Date(),
            30 * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null),
    end_date:
      input?.end_date ??
      (Math.random() > 0.3
        ? RandomGenerator.date(
            new Date(input?.start_date ?? new Date()),
            60 * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null),
  };
}
