import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM department creation data for E2E testing.
 *
 * Generates a complete IHrmDepartment.ICreate with randomized values for testing department management functionality.
 *
 * This function creates realistic department data including:
 * - Department names using human-readable naming conventions
 * - Optional descriptions with meaningful paragraph content
 * - Optional parent department references using UUID format
 *
 * @param input - Optional partial input to override specific properties
 * @returns Complete IHrmDepartment.ICreate object with all required fields
 */
export function prepare_random_hrm_department(
  input?: DeepPartial<IHrmDepartment.ICreate>,
): IHrmDepartment.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    parent_department_id:
      input?.parent_department_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
