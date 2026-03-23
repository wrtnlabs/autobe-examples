import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_roles_create } from "../../../generate/generate_random_hrm_platform_admin_roles_create";
import { generate_random_hrm_platform_admin_roles_permissions_create } from "../../../generate/generate_random_hrm_platform_admin_roles_permissions_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

/**
 * Test that permission removal fails when the permission is not assigned to the role.
 *
 * This test verifies that attempting to remove a permission that doesn't exist
 * on a role returns a 404 Not Found error. The test creates a role with limited
 * permissions and attempts to remove a permission that was never added.
 */
export async function test_api_role_permission_removal_nonexistent_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create a custom role with only 'project_view' permission
  const role = await generate_random_hrm_platform_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: "Test role with limited permissions",
        permissions: ["project_view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Verify the role has only 'project_view' permission (from creation response)
  TestValidator.equals(
    "role has project_view permission",
    role.permissions.includes("project_view"),
    true,
  );
  TestValidator.equals(
    "role does not have employee_manage permission",
    role.permissions.includes("employee_manage"),
    false,
  );
  // 4. Attempt to remove 'employee_manage' permission (which doesn't exist on this role)
  await TestValidator.httpError(
    "removing non-existent permission returns 404",
    404,
    async () => {
      await api.functional.hrmPlatform.admin.roles.permissions.erasePermission(
        adminConnection,
        {
          roleId: role.id,
          permissionCode: "employee_manage",
        },
      );
    },
  );
  // 5. Add 'employee_manage' permission to the role
  const permission =
    await generate_random_hrm_platform_admin_roles_permissions_create(
      adminConnection,
      {
        params: { roleId: role.id },
        body: {
          permission_code: "employee_manage",
        } satisfies IHrmPlatformRolePermission.ICreate,
      },
    );
  typia.assert(permission);
  // 6. Remove 'employee_manage' permission (successful removal)
  await api.functional.hrmPlatform.admin.roles.permissions.erasePermission(
    adminConnection,
    {
      roleId: role.id,
      permissionCode: "employee_manage",
    },
  );
  // 7. Attempt to remove 'employee_manage' permission again (already soft-deleted)
  await TestValidator.httpError(
    "removing already soft-deleted permission returns 404",
    404,
    async () => {
      await api.functional.hrmPlatform.admin.roles.permissions.erasePermission(
        adminConnection,
        {
          roleId: role.id,
          permissionCode: "employee_manage",
        },
      );
    },
  );
  // 8. Attempt to remove 'project_view' permission that still exists (should succeed)
  await api.functional.hrmPlatform.admin.roles.permissions.erasePermission(
    adminConnection,
    {
      roleId: role.id,
      permissionCode: "project_view",
    },
  );
  // 9. Attempt to remove 'project_view' permission again (already soft-deleted)
  await TestValidator.httpError(
    "removing second already soft-deleted permission returns 404",
    404,
    async () => {
      await api.functional.hrmPlatform.admin.roles.permissions.erasePermission(
        adminConnection,
        {
          roleId: role.id,
          permissionCode: "project_view",
        },
      );
    },
  );
}
