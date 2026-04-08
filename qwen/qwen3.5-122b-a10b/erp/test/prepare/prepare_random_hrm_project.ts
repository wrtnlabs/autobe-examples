import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM project creation data for E2E testing.
 *
 * Generates a complete IHrmProject.ICreate with randomized values. All required fields
 * (name, color_code, status) are always populated with realistic test data. Optional
 * fields (description, budget_hours, start_date, end_date) are generated with
 * sensible defaults for comprehensive testing scenarios.
 *
 * @param input Optional partial input to override specific fields
 * @returns Complete IHrmProject.ICreate object ready for testing
 */
export function prepare_random_hrm_project(
  input?: DeepPartial<IHrmProject.ICreate>,
): IHrmProject.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    color_code: input?.color_code
      ? input.color_code
      : `#${RandomGenerator.alphabets(6).toUpperCase()}${Math.random() < 0.5 ? RandomGenerator.alphabets(2).toUpperCase() : ""}`,
    status:
      input?.status ??
      RandomGenerator.pick(["active", "archived", "completed"] as const),
    budget_hours:
      input?.budget_hours ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>
      >(),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
