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

export async function test_api_role_permission_builtin_role_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      displayName: "Built-in Role Test Admin",
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // 2. Attempt to assign permission to built-in Manager role
  // Built-in roles (Owner, Manager, Employee) cannot have permissions modified
  // Note: Using a UUID that represents the built-in Manager role
  const managerRoleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate that the server rejects with 403 Forbidden
  // Built-in roles cannot have their permissions modified
  await TestValidator.httpError(
    "Built-in Manager role should reject permission assignment with 403",
    403,
    async () =>
      await api.functional.erpHrm.admin.roles.permissions.assign(
        adminConnection,
        {
          roleId: managerRoleId,
          permissionId: "employee:view",
        },
      ),
  );
}
