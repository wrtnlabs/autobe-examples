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

export async function test_api_role_permission_update_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin via POST /erpHrm/auth/admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a custom role with initial permissions via POST /erpHrm/admin/roles
  const initialPermissions = ["project:view", "employee:view"] as const;
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `Custom Role ${RandomGenerator.alphabets(8)}`,
        permissions: [...initialPermissions],
      },
    },
  );
  typia.assert(role);
  // 3. Extract the created role's ID from the response
  const roleId = role.id;
  // 4. Send PUT request with new permission codes to replace existing ones
  const newPermissions: IErpHrmRole.IPermissionUpdate["permission_codes"] = [
    "project:manage",
    "time:approve",
    "report:view",
  ];
  const updatedRole =
    await api.functional.erpHrm.admin.roles.permissions.update(
      adminConnection,
      {
        roleId: roleId,
        body: {
          permission_codes: newPermissions,
        },
      },
    );
  typia.assert(updatedRole);
  // 5. Validate response returns 200 OK (implicit - no error thrown)
  // 6. Verify response body contains the updated role with the new permission set
  TestValidator.equals("role ID matches", updatedRole.id, roleId);
  // 7. Confirm the new permissions are reflected in rolePermissions array
  const newPermissionSet = new Set(newPermissions);
  TestValidator.equals(
    "permission count matches",
    updatedRole.rolePermissions.length,
    newPermissions.length,
  );
  // 8. Verify permissions_count reflects the new total
  if (updatedRole.permissions_count !== undefined) {
    TestValidator.equals(
      "permissions_count matches new total",
      updatedRole.permissions_count,
      newPermissions.length,
    );
  }
  // Verify all new permissions are present in rolePermissions
  for (const perm of newPermissions) {
    const found = updatedRole.rolePermissions.some(
      (rp) => rp.permission === perm,
    );
    TestValidator.predicate(`permission ${perm} is assigned`, found);
  }
}