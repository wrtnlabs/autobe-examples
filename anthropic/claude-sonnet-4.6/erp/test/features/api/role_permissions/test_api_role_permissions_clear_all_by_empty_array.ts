import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_permissions_clear_all_by_empty_array(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new organization (the member automatically becomes owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role with initial permissions
  const role = await generate_random_erp_hrm_member_organizations_roles_create(
    memberConnection,
    {
      params: { organizationId: organization.id },
      body: {
        name: RandomGenerator.alphabets(8),
        permissions: ["project:manage", "time:view_all"],
      },
    },
  );
  typia.assert(role);
  // Verify initial role has permissions
  TestValidator.predicate(
    "initial role has permissions",
    role.permissions.length > 0,
  );
  TestValidator.predicate("role is not builtin", role.isBuiltin === false);
  // Record the original updatedAt before clearing
  const originalUpdatedAt = role.updatedAt;
  // 4. Primary Test: Clear all permissions by supplying an empty array
  const clearedRole =
    await api.functional.erpHrm.member.organizations.roles.permissions.update(
      memberConnection,
      {
        organizationId: organization.id,
        roleId: role.id,
        body: {
          permissionCodes: [],
        } satisfies IErpHrmRolePermission.IUpdate,
      },
    );
  typia.assert(clearedRole);
  // 5. Verify permissions are empty
  TestValidator.equals(
    "permissions array is empty",
    clearedRole.permissions.length,
    0,
  );
  // 6. Verify isBuiltin is false
  TestValidator.predicate(
    "isBuiltin is false after clear",
    clearedRole.isBuiltin === false,
  );
  // 7. Verify the role still exists and identity is intact
  TestValidator.equals("role id matches", clearedRole.id, role.id);
  TestValidator.equals(
    "organizationId matches",
    clearedRole.organizationId,
    organization.id,
  );
  // 8. Verify updatedAt has been updated (>= original)
  TestValidator.predicate(
    "updatedAt is updated after permission clear",
    new Date(clearedRole.updatedAt).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
  // 9. Business Rule: Verify a role with zero permissions is valid (no error was thrown above)
  // Also verify that subsequent calls to add permissions back succeed
  const restoredRole =
    await api.functional.erpHrm.member.organizations.roles.permissions.update(
      memberConnection,
      {
        organizationId: organization.id,
        roleId: role.id,
        body: {
          permissionCodes: ["project:manage", "employee:view"],
        } satisfies IErpHrmRolePermission.IUpdate,
      },
    );
  typia.assert(restoredRole);
  TestValidator.equals(
    "restored role has 2 permissions",
    restoredRole.permissions.length,
    2,
  );
  TestValidator.predicate(
    "restored role has project:manage",
    restoredRole.permissions.some(
      (p) => p.permission_code === "project:manage",
    ),
  );
  TestValidator.predicate(
    "restored role has employee:view",
    restoredRole.permissions.some((p) => p.permission_code === "employee:view"),
  );
}
