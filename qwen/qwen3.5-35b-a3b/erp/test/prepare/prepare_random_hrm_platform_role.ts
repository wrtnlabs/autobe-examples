import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform role creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformRole.ICreate with randomized values
 * for creating custom employee roles within an organization. Use this
 * function to create test data for role management scenarios including
 * permission sets and access control testing.
 */
export function prepare_random_hrm_platform_role(
  input?: DeepPartial<IHrmPlatformRole.ICreate> | undefined,
): IHrmPlatformRole.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    role_kind: "custom" as const,
  };
}
