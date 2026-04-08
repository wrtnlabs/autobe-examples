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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_permission_update_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a custom role with initial permissions
  const initialPermissions = ["org:manage", "employee:manage"] as const;
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `Test Role ${RandomGenerator.alphaNumeric(8)}`,
        permissions: [...initialPermissions],
      },
    },
  );
  typia.assert(role);
  const roleId = role.id;
  // 3. Update the custom role's permissions to a new set
  const newPermissions = [
    "employee:view",
    "project:view",
    "report:view",
  ] as const;
  const updateResult =
    await api.functional.erpHrm.member.roles.permissions.updatePermissions(
      adminConnection,
      {
        roleId: roleId,
        body: {
          permissions: [...newPermissions],
        },
      },
    );
  typia.assert(updateResult);
  // 4. Validations
  // Verify permissions count matches exactly
  TestValidator.equals(
    "permissions count matches new set",
    updateResult.permissions.length,
    newPermissions.length,
  );
  // Verify each new permission is in the result
  for (const perm of newPermissions) {
    TestValidator.predicate(
      `contains permission ${perm}`,
      updateResult.permissions.includes(perm),
    );
  }
  // Verify role details
  TestValidator.equals(
    "role is custom (not built-in)",
    updateResult.role.isBuiltin,
    false,
  );
  TestValidator.equals("role id matches", updateResult.role.id, roleId);
  // Verify old permissions are NOT in the new set
  TestValidator.predicate(
    "org:manage removed",
    !updateResult.permissions.includes("org:manage"),
  );
  TestValidator.predicate(
    "employee:manage removed",
    !updateResult.permissions.includes("employee:manage"),
  );
}
