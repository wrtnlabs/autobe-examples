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

export async function test_api_role_permission_bulk_update_clear_all_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a custom role with initial permissions
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: "MinimalAccessRole",
        permissions: ["employee:view", "project:view"] as const,
      },
    },
  );
  typia.assert(role);
  // 3. Verify role was created with both permissions
  TestValidator.equals(
    "role has 2 initial permissions",
    role.rolePermissions.length,
    2,
  );
  TestValidator.predicate(
    "role contains employee:view permission",
    role.rolePermissions.some((p) => p.permission === "employee:view"),
  );
  TestValidator.predicate(
    "role contains project:view permission",
    role.rolePermissions.some((p) => p.permission === "project:view"),
  );
  // 4. Update permissions to empty array (clear all permissions)
  const updatedRole =
    await api.functional.erpHrm.admin.roles.permissions.bulk.bulkUpdate(
      adminConnection,
      {
        roleId: role.id,
        body: {
          permissions: [],
        },
      },
    );
  typia.assert(updatedRole);
  // 5. Validate the role now has no permissions
  TestValidator.equals(
    "role has zero permissions after clear",
    updatedRole.rolePermissions.length,
    0,
  );
}
