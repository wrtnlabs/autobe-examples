import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform project creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformProject.ICreate with randomized values for all properties.
 * The function supports test-time customization through the optional input parameter,
 * allowing specific fields to be overridden while auto-generating the rest.
 *
 * Required fields include {@link name} for project identification and {@link color} as a hex
 * color code for UI visual distinction. Optional fields allow specifying {@link description}
 * for context, {@link budgetHours} for capacity planning, and {@link startDate}/{@link endDate}
 * for timeline tracking.
 *
 * @param input - Optional partial data for test-time customization
 * @returns Complete IHrmPlatformProject.ICreate object with all required fields populated
 */
export function prepare_random_hrm_platform_project(
  input?: DeepPartial<IHrmPlatformProject.ICreate>,
): IHrmPlatformProject.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 4 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 5,
      }),
    color:
      input?.color ??
      RandomGenerator.pick([
        "#FF5733",
        "#33FF57",
        "#3357FF",
        "#FF33F5",
        "#F5FF33",
        "#33FFF5",
      ] as const),
    budgetHours:
      input?.budgetHours ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
      >(),
    startDate:
      input?.startDate ?? typia.random<string & tags.Format<"date-time">>(),
    endDate:
      input?.endDate ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
