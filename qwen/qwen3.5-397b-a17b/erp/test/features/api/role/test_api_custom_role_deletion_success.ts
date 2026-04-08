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
 * Test successful deletion of a custom role with no employee assignees.
 *
 * Validates the complete custom role deletion workflow including member authentication, organization creation, custom role setup, and successful role deletion. Ensures that custom roles can be deleted when no employees are assigned to them and that the deletion operation respects organization boundaries.
 *
 * Special attention is given to verifying that the role is properly marked as custom (isBuiltIn: false) and that the deletion completes without errors, returning 204 No Content status.
 *
 * 1. Member joins the platform with valid credentials using authorize_member_join utility.
 * 2. Member creates an organization using generate_random_hrm_platform_member_organizations_create utility (automatically becomes owner).
 * 3. Member creates a custom role within the organization using generate_random_hrm_platform_member_roles_create utility with specific permissions.
 * 4. Verify the role is created successfully and is marked as custom (isBuiltIn: false).
 * 5. Delete the custom role using api.functional.hrmPlatform.member.roles.erase with the role's UUID.
 * 6. Verify the deletion completes without error (204 No Content).
 */
export async function test_api_custom_role_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization (member automatically becomes owner)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role within the organization
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Verify role is custom (not built-in)
  TestValidator.equals("role is custom", role.isBuiltIn, false);
  TestValidator.equals(
    "role belongs to organization",
    role.organization.id,
    organization.id,
  );
  // 5. Delete the custom role
  await api.functional.hrmPlatform.member.roles.erase(memberConnection, {
    roleId: role.id,
  });
}
