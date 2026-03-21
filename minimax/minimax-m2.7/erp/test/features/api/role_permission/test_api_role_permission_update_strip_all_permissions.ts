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

export async function test_api_role_permission_update_strip_all_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Create a custom role with initial permissions
  const customRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `Test Role ${RandomGenerator.alphaNumeric(8)}`,
        permissions: ["employee:manage", "project:view", "time:view_all"] as (
          | "org:manage"
          | "employee:manage"
          | "employee:view"
          | "project:manage"
          | "project:view"
          | "time:manage"
          | "time:approve"
          | "time:view_all"
          | "report:view"
        )[],
      },
    },
  );
  typia.assert(customRole);
  // 3. Verify role was created with permissions
  TestValidator.predicate(
    "role should have initial permissions",
    customRole.rolePermissions.length > 0,
  );
  const initialPermissionsCount =
    customRole.permissions_count ?? customRole.rolePermissions.length;
  TestValidator.predicate(
    "role should have initial permissions count > 0",
    initialPermissionsCount > 0,
  );
  // 4. Strip all permissions by sending empty array
  const updatedRole =
    await api.functional.erpHrm.admin.roles.permissions.update(
      adminConnection,
      {
        roleId: customRole.id,
        body: {
          permission_codes: [],
        } satisfies IErpHrmRole.IPermissionUpdate,
      },
    );
  typia.assert(updatedRole);
  // 5. Validate response
  TestValidator.equals(
    "role id should remain the same",
    updatedRole.id,
    customRole.id,
  );
  TestValidator.equals(
    "role name should remain the same",
    updatedRole.name,
    customRole.name,
  );
  // 6. Verify rolePermissions array is empty
  TestValidator.equals(
    "rolePermissions array should be empty",
    updatedRole.rolePermissions,
    [],
  );
  // 7. Confirm permissions_count is 0
  TestValidator.equals(
    "permissions_count should be 0",
    updatedRole.permissions_count,
    0,
  );
  // 8. Verify the role still belongs to the same organization
  TestValidator.equals(
    "role should still belong to same organization",
    updatedRole.organization.id,
    customRole.organization.id,
  );
}
