import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM role creation data for E2E testing.
 *
 * Generates a complete IHrmRole.ICreate with randomized values for custom role creation within an organization.
 *
 * @param input Optional partial input to override specific properties
 * @returns Complete IHrmRole.ICreate object with all required fields populated
 */
export function prepare_random_hrm_role(
  input?: DeepPartial<IHrmRole.ICreate> | undefined,
): IHrmRole.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
