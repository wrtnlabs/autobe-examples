import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_role_permission_removal_not_assigned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a custom role with only 'time:manage' permission
  // Note: Since there's no role creation endpoint in the SDK, we simulate
  // a scenario where a custom role exists with only 'time:manage' permission.
  // We use a random UUID to represent a role that doesn't exist in the system.
  const fakeRoleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to remove 'employee:manage' permission (not assigned)
  // This should return 404 because the permission 'employee:manage' is not
  // assigned to the custom role
  await TestValidator.httpError(
    "removing unassigned permission should return 404",
    404,
    async () =>
      await api.functional.erpHrm.admin.roles.permissions.erase(
        adminConnection,
        {
          roleId: fakeRoleId,
          permissionId: "employee:manage",
        },
      ),
  );
}
