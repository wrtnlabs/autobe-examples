import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time track project creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackProject.ICreate with randomized values for
 * project name, color code, description, status, budget hours, and timeline dates.
 * All fields are customizable via the input parameter for specific test scenarios.
 *
 * @param input - Optional partial data to override random generation
 * @returns Complete IHrmTimeTrackProject.ICreate instance
 */
export function prepare_random_hrm_time_track_project(
  input?: DeepPartial<IHrmTimeTrackProject.ICreate> | undefined,
): IHrmTimeTrackProject.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    color_code: input?.color_code ?? RandomGenerator.alphaNumeric(7),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    status:
      input?.status ??
      RandomGenerator.pick([
        "active",
        "planned",
        "completed",
        "archived",
      ] as const),
    budget_hours:
      input?.budget_hours ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
      >(),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
