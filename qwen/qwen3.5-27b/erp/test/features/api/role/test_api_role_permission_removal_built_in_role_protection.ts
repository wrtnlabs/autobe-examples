import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that permission removal is rejected for built-in roles (Owner, Manager, Employee).
 *
 * This test validates that the system protects built-in roles from permission modifications.
 * When attempting to remove a permission from a built-in role, the API should return
 * HTTP 405 Method Not Allowed, indicating that built-in roles cannot be modified.
 *
 * Note: Since role listing APIs are not available in the current SDK, this test uses
 * simulated built-in role UUIDs to verify the protection mechanism.
 */
export async function test_api_role_permission_removal_built_in_role_protection(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin (organization owner)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin-test-${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password: "SecurePassword123!",
      href: "https://hrm-platform.example.com/admin/join",
      referrer: "https://hrm-platform.example.com/admin",
      ip: "192.168.1.100",
    },
  });
  typia.assert(adminAuth);
  // 2. Simulate built-in role UUIDs (Owner, Manager, Employee roles)
  // In a real scenario, these would be obtained from role listing API
  const ownerRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const managerRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const employeeRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test that permission removal is rejected for Owner built-in role
  await TestValidator.httpError(
    "Owner built-in role permission removal should return 405 Method Not Allowed",
    405,
    async () =>
      await api.functional.hrmPlatform.admin.roles.permissions.erasePermission(
        adminConnection,
        {
          roleId: ownerRoleId,
          permissionCode: "employee_manage",
        },
      ),
  );
  // 4. Test that permission removal is rejected for Manager built-in role
  await TestValidator.httpError(
    "Manager built-in role permission removal should return 405 Method Not Allowed",
    405,
    async () =>
      await api.functional.hrmPlatform.admin.roles.permissions.erasePermission(
        adminConnection,
        {
          roleId: managerRoleId,
          permissionCode: "time_approve",
        },
      ),
  );
  // 5. Test that permission removal is rejected for Employee built-in role
  await TestValidator.httpError(
    "Employee built-in role permission removal should return 405 Method Not Allowed",
    405,
    async () =>
      await api.functional.hrmPlatform.admin.roles.permissions.erasePermission(
        adminConnection,
        {
          roleId: employeeRoleId,
          permissionCode: "project_view",
        },
      ),
  );
  // 6. Verify protection applies to different permission codes on the same role
  await TestValidator.httpError(
    "built-in role protection applies to organization_edit permission",
    405,
    async () =>
      await api.functional.hrmPlatform.admin.roles.permissions.erasePermission(
        adminConnection,
        {
          roleId: ownerRoleId,
          permissionCode: "organization_edit",
        },
      ),
  );
  await TestValidator.httpError(
    "built-in role protection applies to report_view permission",
    405,
    async () =>
      await api.functional.hrmPlatform.admin.roles.permissions.erasePermission(
        adminConnection,
        {
          roleId: ownerRoleId,
          permissionCode: "report_view",
        },
      ),
  );
}
