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

export async function test_api_custom_role_creation_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.erpHrm.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  // 2. Create admin-specific connection with JWT token
  const adminTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 3. Prepare role creation payload with valid permissions
  const roleName = RandomGenerator.alphabets(10);
  const permissions = ["employee:view", "project:view", "report:view"] as const;
  // 4. Create the custom role
  const role = await api.functional.erpHrm.admin.roles.create(
    adminTokenConnection,
    {
      body: {
        name: roleName,
        permissions: [...permissions],
      },
    },
  );
  // 5. Validate the response with typia
  typia.assert(role);
  // 6. Business logic validations
  TestValidator.equals("role name matches", role.name, roleName);
  TestValidator.equals("role is custom (not builtin)", role.isBuiltin, false);
  TestValidator.equals("organization is set", role.organization !== null, true);
  TestValidator.equals(
    "permission count matches",
    role.rolePermissions.length,
    permissions.length,
  );
  // 7. Validate all requested permissions are present
  const permissionSet = new Set(
    role.rolePermissions.map((rp) => rp.permission),
  );
  for (const perm of permissions) {
    TestValidator.equals(
      `permission ${perm} is assigned`,
      permissionSet.has(perm),
      true,
    );
  }
  // 8. Validate timestamps are valid ISO format
  TestValidator.predicate(
    "createdAt is valid ISO date-time",
    /(^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/.test(role.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO date-time",
    /(^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/.test(role.updatedAt),
  );
  // 9. Validate role permissions have valid structure
  for (const rolePermission of role.rolePermissions) {
    typia.assert(rolePermission);
    TestValidator.equals(
      "permission format matches pattern",
      /^[a-z]+:[a-z_]+$/.test(rolePermission.permission),
      true,
    );
    TestValidator.equals(
      "role permission has valid role reference",
      rolePermission.role.id === role.id,
      true,
    );
  }
}
