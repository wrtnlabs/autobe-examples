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
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test that permission changes to a role immediately affect all employees assigned to that role.
 * This test validates the dynamic role-based access control mechanism by:
 * 1. Creating a custom role with initial permissions
 * 2. Updating the role's permissions
 * 3. Verifying the permission changes are reflected immediately
 */
export async function test_api_role_permission_update_employee_access_immediate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create a custom role with initial permissions
  const initialPermissions = ["employee_view", "project_view"];
  const role = await generate_random_hrm_platform_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: "Test role for permission update validation",
        permissions: initialPermissions,
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Verify initial permissions
  TestValidator.equals("initial permissions count", role.permissions.length, 2);
  TestValidator.equals(
    "has employee_view",
    role.permissions.includes("employee_view"),
    true,
  );
  TestValidator.equals(
    "has project_view",
    role.permissions.includes("project_view"),
    true,
  );
  TestValidator.equals(
    "does not have employee_manage",
    role.permissions.includes("employee_manage"),
    false,
  );
  // 4. Update role permissions: remove employee_view, add employee_manage
  const updatedPermissions: ("employee_manage" | "project_view")[] = ["employee_manage", "project_view"];
  const updatedRole =
    await api.functional.hrmPlatform.admin.roles.permissions.updatePermissions(
      adminConnection,
      {
        roleId: role.id,
        body: {
          permission_codes: updatedPermissions,
        } satisfies IHrmPlatformRolePermission.IUpdate,
      },
    );
  typia.assert(updatedRole);
  // 5. Verify permission changes are reflected immediately
  TestValidator.equals(
    "updated permissions count",
    updatedRole.permissions.length,
    2,
  );
  TestValidator.equals(
    "employee_view removed",
    updatedRole.permissions.includes("employee_view"),
    false,
  );
  TestValidator.equals(
    "employee_manage added",
    updatedRole.permissions.includes("employee_manage"),
    true,
  );
  TestValidator.equals(
    "project_view retained",
    updatedRole.permissions.includes("project_view"),
    true,
  );
  // 6. Verify role identity remains the same
  TestValidator.equals("role id unchanged", updatedRole.id, role.id);
  TestValidator.equals("role name unchanged", updatedRole.name, role.name);
  // 7. Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedRole.updated_at,
    role.updated_at,
  );
}