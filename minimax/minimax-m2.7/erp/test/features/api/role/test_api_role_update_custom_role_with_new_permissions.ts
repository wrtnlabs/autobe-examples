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

export async function test_api_role_update_custom_role_with_new_permissions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin via POST /erpHrm/auth/admin/join to obtain JWT token
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Create a new custom role via POST /erpHrm/admin/roles with initial name 'TestRole' and permission codes ['project:view']
  const initialRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: "TestRole",
        permissions: ["project:view"],
      },
    },
  );
  typia.assert(initialRole);
  // Step 3: Extract the created role ID from the response
  const roleId = initialRole.id;
  // Step 4: Send PUT request to /erpHrm/admin/roles/{roleId} with updated name and permissions
  const updatedRole = await api.functional.erpHrm.admin.roles.update(
    adminConnection,
    {
      roleId: roleId,
      body: {
        name: "UpdatedRoleName",
        permission_codes: ["org:manage", "time:approve"],
      },
    },
  );
  typia.assert(updatedRole);
  // Step 5: Verify response contains role.id matches the created role ID
  TestValidator.equals("role ID matches", updatedRole.id, roleId);
  // Step 6: Verify response contains role.name equals 'UpdatedRoleName'
  TestValidator.equals(
    "role name updated",
    updatedRole.name,
    "UpdatedRoleName",
  );
  // Step 7: Verify role.is_builtin is false
  TestValidator.equals("is_builtin is false", updatedRole.is_builtin, false);
  // Step 8: Verify role.rolePermissions contains exactly 2 permissions: 'org:manage' and 'time:approve'
  TestValidator.equals(
    "permissions count equals 2",
    updatedRole.rolePermissions.length,
    2,
  );
  TestValidator.predicate(
    "contains org:manage permission",
    updatedRole.rolePermissions.some((p) => p.permission === "org:manage"),
  );
  TestValidator.predicate(
    "contains time:approve permission",
    updatedRole.rolePermissions.some((p) => p.permission === "time:approve"),
  );
  // Step 9: Verify permissions_count equals 2
  if (updatedRole.permissions_count !== undefined) {
    TestValidator.equals(
      "permissions_count equals 2",
      updatedRole.permissions_count,
      2,
    );
  }
  // Step 10: Verify updated_at timestamp is more recent than created_at
  const createdAt = new Date(initialRole.created_at).getTime();
  const updatedAt = new Date(updatedRole.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is more recent than created_at",
    updatedAt >= createdAt,
  );
}
