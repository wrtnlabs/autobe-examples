import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test retrieval of a permission assignment from a built-in role.
 *
 * Workflow:
 * 1. Authenticate as member via join
 * 2. Create organization (auto-creates built-in roles: Owner, Manager, Employee)
 * 3. List roles with is_builtin=true filter to get built-in role
 * 4. Retrieve a permission assignment from the built-in role
 * 5. Validate response contains correct permission code, role info with is_builtin=true,
 *    built-in role name (Owner/Manager/Employee), and organization reference
 */
export async function test_api_role_permission_retrieval_builtin_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  memberConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // 2. Create organization (automatically creates built-in roles)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. List roles to find a built-in role (is_builtin=true)
  const rolesResponse = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        is_builtin: true,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(rolesResponse);
  // Validate we got built-in roles
  TestValidator.predicate(
    "has built-in roles",
    () => rolesResponse.data.length > 0,
  );
  const builtinRole = rolesResponse.data[0]!;
  TestValidator.equals("role is builtin", builtinRole.is_builtin, true);
  TestValidator.predicate("is Owner/Manager/Employee", () =>
    ["Owner", "Manager", "Employee"].includes(builtinRole.name),
  );
  TestValidator.equals(
    "role has organization",
    builtinRole.organization.id,
    organization.id,
  );
  // 4. Retrieve a permission assignment from the built-in role
  // Note: This requires the backend to have default permissions for built-in roles
  // or the test may need a permission listing endpoint to get valid permission IDs
  const permissionId = typia.random<string & tags.Format<"uuid">>();
  const permission =
    await api.functional.hrmPlatform.member.roles.permissions.at(
      memberConnection,
      {
        roleId: builtinRole.id,
        permissionId: permissionId,
      },
    );
  typia.assert(permission);
  // 5. Validate the permission assignment response
  TestValidator.equals(
    "permission role ID matches",
    permission.role.id,
    builtinRole.id,
  );
  TestValidator.equals(
    "permission role is builtin",
    permission.role.is_builtin,
    true,
  );
  TestValidator.predicate("permission role name is valid", () =>
    ["Owner", "Manager", "Employee"].includes(permission.role.name),
  );
  TestValidator.equals(
    "permission organization matches",
    permission.role.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "has permission code",
    () => permission.permission.length > 0,
  );
  typia.assert(permission.created_at);
  typia.assert(permission.updated_at);
  TestValidator.equals("permission not deleted", permission.deleted_at, null);
}
