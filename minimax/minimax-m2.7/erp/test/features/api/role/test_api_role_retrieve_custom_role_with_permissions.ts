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

export async function test_api_role_retrieve_custom_role_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a custom role with specific permissions
  const customRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: ["employee:manage", "project:view", "time:view_all"],
      },
    },
  );
  typia.assert(customRole);
  // 3. Retrieve the custom role by its ID
  const retrievedRole = await api.functional.erpHrm.admin.roles.at(
    adminConnection,
    {
      roleId: customRole.id,
    },
  );
  typia.assert(retrievedRole);
  // 4. Validate custom role details
  TestValidator.equals("role is builtin", retrievedRole.is_builtin, false);
  TestValidator.equals(
    "role name matches",
    retrievedRole.name,
    customRole.name,
  );
  TestValidator.predicate(
    "role has permissions",
    retrievedRole.rolePermissions.length > 0,
  );
  TestValidator.predicate(
    "permissions_count matches",
    retrievedRole.permissions_count === retrievedRole.rolePermissions.length,
  );
  TestValidator.equals("employees count", retrievedRole.employees_count, 0);
  TestValidator.equals("invitations count", retrievedRole.invitations_count, 0);
}
