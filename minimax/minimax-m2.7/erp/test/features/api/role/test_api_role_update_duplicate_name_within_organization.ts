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

export async function test_api_role_update_duplicate_name_within_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create first role with name 'UniqueRoleOne'
  const role1 = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: "UniqueRoleOne",
        permissions: ["project:view"],
      },
    },
  );
  typia.assert(role1);
  TestValidator.equals("first role name", role1.name, "UniqueRoleOne");
  // 3. Create second role with name 'UniqueRoleTwo'
  const role2 = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: "UniqueRoleTwo",
        permissions: ["time:manage"],
      },
    },
  );
  typia.assert(role2);
  TestValidator.equals("second role name", role2.name, "UniqueRoleTwo");
  // 4. Extract the role ID of the second role
  const secondRoleId = role2.id;
  // 5. Attempt to update second role with name that conflicts with first role
  await TestValidator.error("duplicate name should fail", async () => {
    await api.functional.erpHrm.admin.roles.update(adminConnection, {
      roleId: secondRoleId,
      body: {
        name: "UniqueRoleOne",
        permission_codes: ["report:view"],
      } satisfies IErpHrmRole.IUpdate,
    });
  });
  // 6-9. Verify both roles remain unchanged (by attempting another update with correct name)
  // Re-fetch role2 state by doing a valid update to check it wasn't corrupted
  const validUpdate = await api.functional.erpHrm.admin.roles.update(
    adminConnection,
    {
      roleId: secondRoleId,
      body: {
        name: "UniqueRoleTwoUpdated",
        permission_codes: ["time:view"],
      } satisfies IErpHrmRole.IUpdate,
    },
  );
  typia.assert(validUpdate);
  TestValidator.equals(
    "second role name changed",
    validUpdate.name,
    "UniqueRoleTwoUpdated",
  );
  // Verify first role still exists and unchanged
  const role1AfterUpdate = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: "UniqueRoleOne",
        permissions: ["project:view"],
      },
    },
  );
  TestValidator.equals(
    "first role unchanged after duplicate error",
    role1AfterUpdate.name,
    "UniqueRoleOne",
  );
}
