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

export async function test_api_role_deletion_custom_role_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a new custom role with a unique name and at least one permission
  const customRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {},
  );
  // Validate the role was created successfully
  typia.assert(customRole);
  TestValidator.equals("role is not builtin", customRole.isBuiltin, false);
  TestValidator.predicate(
    "role has at least one permission",
    customRole.rolePermissions.length > 0,
  );
  // 3. Extract the roleId
  const roleId = customRole.id;
  // 4. Delete the role using DELETE /erpHrm/admin/roles/{roleId}
  // The erase function returns void, which indicates 204 No Content on success
  await api.functional.erpHrm.admin.roles.erase(adminConnection, {
    roleId: roleId,
  });
  // Validation: The delete request should succeed (204 No Content)
  // Since erase returns void on success, if we reach here without error, deletion was successful
  // The erase endpoint validates that:
  // - Role exists (404 if not)
  // - Role is not builtin (403 if builtin)
  // - No employees are assigned to the role (409 if employees exist)
  // Since we created a new role with no employees, deletion should succeed
}
