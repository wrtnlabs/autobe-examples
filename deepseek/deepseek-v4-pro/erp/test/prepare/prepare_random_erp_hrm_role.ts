import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ERP HRM role creation data for E2E testing.
 *
 * Generates a complete IErpHrmRole.ICreate with randomized values for
 * role name, optional description, and a non-empty set of permission keys.
 *
 * The generated role has a realistic-looking name suitable for testing
 * custom role CRUD operations. The permission keys are randomly generated
 * alphanumeric strings simulating entries from the permissions catalog.
 * All properties can be overridden via the optional DeepPartial input,
 * enabling test scenarios that require specific role configurations.
 *
 * Constraint compliance includes:
 *
 * - At least one permission key is always generated (MinItems<1>)
 * - Description is optional and can be omitted via input override
 * - Role name uses human-readable word-based generation
 */
export function prepare_random_erp_hrm_role(
  input?: DeepPartial<IErpHrmRole.ICreate>,
): IErpHrmRole.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    permissions:
      input?.permissions ??
      ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        () => RandomGenerator.alphaNumeric(12),
      ),
  };
}
