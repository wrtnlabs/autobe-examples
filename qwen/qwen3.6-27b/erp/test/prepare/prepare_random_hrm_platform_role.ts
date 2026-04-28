import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform role creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformRole.ICreate with randomized values for role
 * name, optional description, and permission keys. Use this function as input
 * for role creation API calls.
 *
 * Permission keys are sampled from the platform's predefined capability catalog
 * to ensure realistic and valid permissions are generated.
 *
 * @param input - Partial role creation data for test-time customization
 * @returns Complete IHrmPlatformRole.ICreate ready for API calls
 */
export function prepare_random_hrm_platform_role(
  input?: DeepPartial<IHrmPlatformRole.ICreate> | undefined,
): IHrmPlatformRole.ICreate {
  const PERMISSION_KEYS = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ] as const;
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 1 }),
    permissionKeys: input?.permissionKeys
      ? input.permissionKeys.map((k) => k ?? RandomGenerator.alphabets(8))
      : RandomGenerator.sample(
          [...PERMISSION_KEYS],
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<6>
          >(),
        ),
  };
}
