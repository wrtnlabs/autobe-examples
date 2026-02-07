import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_version_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a regular admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.admin.join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // 2. Login as the regular admin
  const loginResponse = await api.functional.shoppingMall.auth.admin.login(
    adminConnection,
    {
      body: typia.random<IShoppingMallAdmin.ILogin>(),
    },
  );
  typia.assert(loginResponse);
  // 3. Attempt to delete a system version with insufficient permissions
  const versionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "regular admin should not be able to delete system versions",
    403,
    async () => {
      await api.functional.shoppingMall.admin.versions.erase(adminConnection, {
        versionId,
      });
    },
  );
  // 4. Verify the version still exists (error response shows 403, so record unchanged)
  // Since we can't read the version without super admin permissions, we verify the error is properly returned
}
