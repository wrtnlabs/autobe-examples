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

export async function test_api_role_custom_creation_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using authorize_admin_join
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  // 2. Create custom role with specific permissions
  const roleName = "Project Coordinator";
  const permissions = ["project:view", "project:manage"] as const;
  const role = await api.functional.erpHrm.admin.roles.create(adminConnection, {
    body: {
      name: roleName,
      permissions: [...permissions],
    },
  });
  typia.assert(role);
  // 3. Validate response structure
  TestValidator.equals("role name matches", role.name, roleName);
  TestValidator.equals("is_builtin is false", role.is_builtin, false);
  TestValidator.predicate("organization exists", !!role.organization);
  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    (() => {
      const date = new Date(role.created_at);
      return !isNaN(date.getTime());
    })(),
  );
  // 4. Validate rolePermissions array
  TestValidator.equals(
    "rolePermissions array has 2 items",
    role.rolePermissions.length,
    2,
  );
  const permissionCodes = role.rolePermissions.map((rp) => rp.permission);
  TestValidator.predicate(
    "contains 'project:view' permission",
    permissionCodes.includes("project:view"),
  );
  TestValidator.predicate(
    "contains 'project:manage' permission",
    permissionCodes.includes("project:manage"),
  );
  // 5. Validate aggregated counts
  TestValidator.equals("permissions_count is 2", role.permissions_count, 2);
  TestValidator.equals("employees_count is 0", role.employees_count, 0);
}
