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

export async function test_api_role_permission_idempotent_assignment(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Create a custom role with project:view permission
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: "ProjectCoordinator",
        permissions: ["project:view"],
      },
    },
  );
  typia.assert(role);
  // Step 3: Get the existing permission record ID
  const existingPermission = role.rolePermissions.find(
    (rp) => rp.permission === "project:view",
  );
  TestValidator.equals(
    "project:view permission exists on role",
    existingPermission !== undefined,
    true,
  );
  // Step 4: Attempt to assign the same permission again (idempotent operation)
  const idempotentResult =
    await api.functional.erpHrm.admin.roles.permissions.assign(
      adminConnection,
      {
        roleId: role.id,
        permissionId: "project:view",
      },
    );
  typia.assert(idempotentResult);
  // Step 5: Verify idempotent behavior - should return existing record, not create duplicate
  // The permission ID should match the existing one (proving no duplicate was created)
  TestValidator.equals(
    "same permission record returned (idempotent)",
    idempotentResult.id,
    existingPermission!.id,
  );
  TestValidator.equals(
    "permission code matches",
    idempotentResult.permission,
    "project:view",
  );
  TestValidator.equals(
    "role reference matches",
    idempotentResult.role.id,
    role.id,
  );
  // Step 6: Verify no duplicate exists by checking permission count
  const projectViewPermissionCount = role.rolePermissions.filter(
    (rp) => rp.permission === "project:view",
  ).length;
  TestValidator.equals(
    "only one project:view permission exists on role",
    projectViewPermissionCount,
    1,
  );
}
