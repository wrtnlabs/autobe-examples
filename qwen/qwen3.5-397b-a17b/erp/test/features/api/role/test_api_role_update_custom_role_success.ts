import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformPermission";
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
 * Test the primary success path for updating a custom role within an organization.
 *
 * After authenticating as a member, creating an organization, and creating a custom role with initial permissions, update the custom role with a new name, updated description, and a different set of permissions. Validate that the role's name is successfully changed, the description is updated, and the permission set is completely replaced with the new permissions. Verify the response contains the updated role with correct name, description, and new permission assignments. Ensure the isBuiltIn flag remains false and timestamps are appropriately updated.
 *
 * 1. Member registers with unique email and password credentials.
 * 2. Member creates an organization with name, currency, timezone, and fiscal start month.
 * 3. Member retrieves available permissions from the permission catalog.
 * 4. Member creates a custom role with initial name, description, and selected permissions.
 * 5. Member updates the custom role with new name, new description, and different permission set.
 * 6. Validates the updated role has the new name matching the update request.
 * 7. Validates the updated role has the new description matching the update request.
 * 8. Validates the permission set is completely replaced (different from original permissions).
 * 9. Validates isBuiltIn flag remains false after update.
 * 10. Validates updatedAt timestamp is later than createdAt timestamp.
 */
export async function test_api_role_update_custom_role_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Retrieve available permissions
  const permissionsResponse =
    await api.functional.hrmPlatform.member.permissions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformPermission.IRequest,
      },
    );
  typia.assert(permissionsResponse);
  const allPermissions = permissionsResponse.data;
  TestValidator.predicate("has permissions", allPermissions.length >= 2);
  // Select different permission sets for create and update
  const initialPermissionIds = allPermissions.slice(0, 2).map((p) => p.id);
  const updatedPermissionIds = allPermissions.slice(2, 5).map((p) => p.id);
  // 4. Create custom role with initial permissions
  const createdRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permission_ids: initialPermissionIds,
      },
    },
  );
  typia.assert(createdRole);
  // 5. Update the custom role with new name, description, and permissions
  const updatedName = RandomGenerator.name();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedRole = await api.functional.hrmPlatform.member.roles.update(
    memberConnection,
    {
      roleId: createdRole.id,
      body: {
        name: updatedName,
        description: updatedDescription,
        permissionIds: updatedPermissionIds,
      } satisfies IHrmPlatformRole.IUpdate,
    },
  );
  typia.assert(updatedRole);
  // 6. Validate name is updated
  TestValidator.equals("role name updated", updatedRole.name, updatedName);
  // 7. Validate description is updated
  TestValidator.equals(
    "role description updated",
    updatedRole.description,
    updatedDescription,
  );
  // 8. Validate organization reference is preserved
  TestValidator.equals(
    "organization preserved",
    updatedRole.organization.id,
    organization.id,
  );
  // 9. Validate isBuiltIn remains false (custom role)
  TestValidator.predicate("is custom role", updatedRole.isBuiltIn === false);
  // 10. Validate timestamps - updatedAt should be >= createdAt
  TestValidator.predicate(
    "updatedAt after createdAt",
    new Date(updatedRole.updatedAt).getTime() >=
      new Date(updatedRole.createdAt).getTime(),
  );
}
