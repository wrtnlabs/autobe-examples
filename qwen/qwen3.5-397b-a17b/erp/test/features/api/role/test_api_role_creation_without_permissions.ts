import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test custom role creation without any permissions assigned.
 *
 * Validates the complete role creation workflow including member authentication, organization setup, and custom role creation with an empty permission set. Ensures that roles can be created without permissions and updated later to add permissions.
 *
 * Special attention is given to verifying that the is_built_in flag is correctly set to false for custom roles, and that the role creation succeeds even when no permission_ids are provided. This tests the edge case where administrators want to define role structures first and assign permissions incrementally.
 *
 * 1. Member registers with email and credentials to obtain authentication.
 * 2. Member creates an organization as the container for the custom role.
 * 3. Member creates a custom role with unique name but no permissions (permission_ids omitted).
 * 4. Validates role is created with isBuiltIn set to false, name matches input, and organization reference is correct.
 */
export async function test_api_role_creation_without_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role without permissions (permission_ids omitted)
  const roleName = RandomGenerator.name();
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
        name: roleName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        // permission_ids intentionally omitted to test empty permission set
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Validate role creation - business logic only (typia.assert validates types)
  TestValidator.equals("role name matches input", role.name, roleName);
  TestValidator.equals(
    "is built-in flag is false for custom role",
    role.isBuiltIn,
    false,
  );
  TestValidator.equals(
    "organization reference matches",
    role.organization.id,
    organization.id,
  );
}
