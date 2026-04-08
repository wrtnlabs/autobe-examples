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

export async function test_api_role_update_with_new_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create initial custom role with some permissions
  const initialPermissions = ["employee:view", "project:view"] as const;
  const initialRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `Initial Role ${RandomGenerator.alphaNumeric(8)}`,
        permissions: [...initialPermissions],
      },
    },
  );
  typia.assert(initialRole);
  // 3. Define new permissions to update the role with
  const newPermissions = [
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:view_all",
  ];
  // 4. Update the role with new name and modified permissions
  const newRoleName = `Updated Role ${RandomGenerator.alphaNumeric(8)}`;
  const updatedRole = await api.functional.erpHrm.admin.roles.update(
    adminConnection,
    {
      roleId: initialRole.id,
      body: {
        name: newRoleName,
        permissionCodes: newPermissions,
      },
    },
  );
  typia.assert(updatedRole);
  // 5. Validate the updated role
  TestValidator.equals("role name updated", updatedRole.name, newRoleName);
  TestValidator.equals(
    "role permissions count matches",
    updatedRole.rolePermissions.length,
    newPermissions.length,
  );
  // Verify all new permissions are present
  const updatedPermissionStrings = updatedRole.rolePermissions.map(
    (rp) => rp.permission,
  );
  for (const perm of newPermissions) {
    TestValidator.predicate(
      `permission ${perm} is present`,
      updatedPermissionStrings.includes(perm),
    );
  }
  // Verify old permissions are replaced (if not in new set)
  const hasOldOnlyPermission =
    updatedPermissionStrings.includes("employee:view");
  TestValidator.predicate(
    "employee:view still present if included",
    hasOldOnlyPermission === newPermissions.includes("employee:view"),
  );
  // Verify updatedAt is refreshed
  TestValidator.predicate(
    "updatedAt is after createdAt",
    new Date(updatedRole.updatedAt) >= new Date(updatedRole.createdAt),
  );
  // Verify role is not built-in
  TestValidator.equals("role is not built-in", updatedRole.isBuiltin, false);
  // Verify organization is preserved
  TestValidator.equals(
    "organization id preserved",
    updatedRole.organization.id,
    initialRole.organization.id,
  );
}
