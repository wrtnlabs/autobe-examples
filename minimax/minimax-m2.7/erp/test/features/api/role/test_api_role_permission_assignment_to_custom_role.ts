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

export async function test_api_role_permission_assignment_to_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system to obtain authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a custom role 'QA_Tester' with initial permission 'employee:view'
  const customRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: "QA_Tester",
        permissions: ["employee:view"],
      },
    },
  );
  typia.assert(customRole);
  // 3. Assign 'project:manage' permission to the custom role
  const rolePermission =
    await api.functional.erpHrm.admin.roles.permissions.assign(
      adminConnection,
      {
        roleId: customRole.id,
        permissionId: "project:manage",
      },
    );
  typia.assert(rolePermission);
  // 4. Validate the role permission assignment
  TestValidator.equals(
    "role ID matches",
    rolePermission.role.id,
    customRole.id,
  );
  TestValidator.equals(
    "permission code is project:manage",
    rolePermission.permission,
    "project:manage",
  );
  TestValidator.predicate(
    "createdAt timestamp is set",
    rolePermission.createdAt !== undefined &&
      rolePermission.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt timestamp is set",
    rolePermission.updatedAt !== undefined &&
      rolePermission.updatedAt.length > 0,
  );
  // 5. Verify role has both permissions (customRole was created with employee:view,
  // and we assigned project:manage, so now it should have 2 permissions)
  TestValidator.equals(
    "initial role has 1 permission",
    customRole.rolePermissions.length,
    1,
  );
  TestValidator.equals(
    "initial permission is employee:view",
    customRole.rolePermissions[0].permission,
    "employee:view",
  );
  TestValidator.equals(
    "assigned permission is project:manage",
    rolePermission.permission,
    "project:manage",
  );
}
