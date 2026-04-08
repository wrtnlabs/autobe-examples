import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
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
import { generate_random_erp_hrm_admin_roles_permissions_assign_permission } from "../../../generate/generate_random_erp_hrm_admin_roles_permissions_assign_permission";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

export async function test_api_role_permission_builtin_role_modification_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  // 2. Retrieve roles list to find a built-in role
  const rolesResponse = await api.functional.erpHrm.member.roles.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(rolesResponse);
  // 3. Find a built-in role (Owner, Manager, or Employee)
  const builtInRole = rolesResponse.data.find((role) => role.isBuiltin);
  TestValidator.predicate("built-in role exists", builtInRole !== undefined);
  const builtInRoleId = builtInRole!.id;
  // 4. Attempt to assign a permission to the built-in role
  // This should be rejected because built-in roles cannot be modified
  await TestValidator.error(
    "built-in role permission assignment should be rejected",
    async () => {
      await api.functional.erpHrm.admin.roles.permissions.assignPermission(
        adminConnection,
        {
          roleId: builtInRoleId,
          body: {
            permission: "time:manage",
          } satisfies IErpHrmRolePermission.ICreate,
        },
      );
    },
  );
}
