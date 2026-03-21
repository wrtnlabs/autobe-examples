import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test creating custom roles with single and multiple permission assignments.
 *
 * Test Scenarios:
 * 1. Create role 'Timekeeper' with single permission ['time:view_all']
 *    - Validate role name is 'Timekeeper'
 *    - Validate permissions_count is 1
 *    - Validate rolePermissions contains only 'time:view_all'
 *
 * 2. Create role 'Full Access Manager' with multiple permissions
 *    - Permissions: ['org:manage', 'employee:manage', 'project:manage', 'time:manage', 'time:approve', 'time:view_all', 'report:view']
 *    - Validate role name is 'Full Access Manager'
 *    - Validate permissions_count matches the number of assigned permissions (7)
 *    - Validate all 7 permissions are present in rolePermissions
 *
 * Dependencies:
 * - POST /erpHrm/auth/admin/join: Authenticate as admin to create custom roles
 */
export async function test_api_role_creation_single_and_multiple_permissions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // Step 2: Create role 'Timekeeper' with single permission
  const singlePermissionRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: "Timekeeper",
        permissions: ["time:view_all"],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(singlePermissionRole);
  // Validate single permission role
  TestValidator.equals(
    "role name is Timekeeper",
    singlePermissionRole.name,
    "Timekeeper",
  );
  TestValidator.equals(
    "permissions_count is 1",
    singlePermissionRole.permissions_count,
    1,
  );
  TestValidator.equals(
    "rolePermissions has exactly 1 permission",
    singlePermissionRole.rolePermissions.length,
    1,
  );
  TestValidator.equals(
    "permission code is time:view_all",
    singlePermissionRole.rolePermissions[0]!.permission,
    "time:view_all",
  );
  // Step 3: Create role 'Full Access Manager' with multiple permissions
  const multiplePermissions = [
    "org:manage",
    "employee:manage",
    "project:manage",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ] as const;
  const multiplePermissionRole =
    await generate_random_erp_hrm_admin_roles_create(adminConnection, {
      body: {
        name: "Full Access Manager",
        permissions: [...multiplePermissions],
      } satisfies IErpHrmRole.ICreate,
    });
  typia.assert(multiplePermissionRole);
  // Validate multiple permissions role
  TestValidator.equals(
    "role name is Full Access Manager",
    multiplePermissionRole.name,
    "Full Access Manager",
  );
  TestValidator.equals(
    "permissions_count is 7",
    multiplePermissionRole.permissions_count,
    7,
  );
  TestValidator.equals(
    "rolePermissions has exactly 7 permissions",
    multiplePermissionRole.rolePermissions.length,
    7,
  );
  // Verify all permissions are present
  const createdPermissionCodes = multiplePermissionRole.rolePermissions.map(
    (rp) => rp.permission,
  );
  for (const expectedPermission of multiplePermissions) {
    TestValidator.predicate(
      `permission ${expectedPermission} is assigned`,
      createdPermissionCodes.includes(expectedPermission),
    );
  }
}
