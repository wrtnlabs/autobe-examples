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
 * Test that updating a custom role with a duplicate name within the same organization is rejected.
 *
 * Validates the role name uniqueness constraint within an organization context. After authenticating as a member and creating an organization, two distinct custom roles are created with different names. Then attempts to update the first custom role using the second custom role's name. The operation should return a conflict error indicating the role name must be unique within the organization. Both roles should retain their original names and the duplicate name update should not be applied.
 *
 * 1. Member authenticates via registration.
 * 2. Member creates an organization for role management context.
 * 3. Creates first custom role with unique name.
 * 4. Creates second custom role with different unique name.
 * 5. Attempts to update first role with second role's name - expects conflict error.
 * 6. Verifies both roles retain their original names after failed update.
 */
export async function test_api_role_update_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create first custom role
  const role1 = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role1);
  // 4. Create second custom role with different name
  const role2 = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role2);
  // Ensure the two roles have different names
  TestValidator.notEquals("roles have different names", role1.name, role2.name);
  // Store original names for verification
  const originalRole1Name = role1.name;
  const originalRole2Name = role2.name;
  // 5. Attempt to update first role with second role's name - should fail with conflict
  await TestValidator.error("duplicate role name rejected", async () => {
    await api.functional.hrmPlatform.member.roles.update(memberConnection, {
      roleId: role1.id,
      body: {
        name: role2.name,
      } satisfies IHrmPlatformRole.IUpdate,
    });
  });
  // 6. Verify roles retain their original names (stored before update attempt)
  TestValidator.equals(
    "role1 name unchanged after failed update",
    role1.name,
    originalRole1Name,
  );
  TestValidator.equals("role2 name unchanged", role2.name, originalRole2Name);
}