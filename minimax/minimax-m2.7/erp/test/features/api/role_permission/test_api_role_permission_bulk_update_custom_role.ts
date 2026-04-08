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

export async function test_api_role_permission_bulk_update_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create custom role with initial permission 'employee:view'
  const customRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `CustomRole_${RandomGenerator.alphaNumeric(8)}`,
        permissions: ["employee:view"],
      },
    },
  );
  typia.assert(customRole);
  // 3. Verify the role was created with initial permission
  TestValidator.equals("isBuiltin is false", customRole.isBuiltin, false);
  TestValidator.equals(
    "has initial employee:view permission",
    customRole.rolePermissions.some((p) => p.permission === "employee:view"),
    true,
  );
  // 4. Update the role's permissions via bulk update
  const updatedRole =
    await api.functional.erpHrm.admin.roles.permissions.bulk.bulkUpdate(
      adminConnection,
      {
        roleId: customRole.id,
        body: {
          permissions: ["project:manage", "project:view", "report:view"],
        },
      },
    );
  typia.assert(updatedRole);
  // 5. Validate the response returns the role with all three new permissions
  TestValidator.equals(
    "has project:manage",
    updatedRole.rolePermissions.some((p) => p.permission === "project:manage"),
    true,
  );
  TestValidator.equals(
    "has project:view",
    updatedRole.rolePermissions.some((p) => p.permission === "project:view"),
    true,
  );
  TestValidator.equals(
    "has report:view",
    updatedRole.rolePermissions.some((p) => p.permission === "report:view"),
    true,
  );
  // 6. Verify the old permission 'employee:view' is no longer present
  TestValidator.equals(
    "employee:view is removed",
    updatedRole.rolePermissions.some((p) => p.permission === "employee:view"),
    false,
  );
  // 7. Confirm role.isBuiltin is false
  TestValidator.equals("isBuiltin remains false", updatedRole.isBuiltin, false);
}
