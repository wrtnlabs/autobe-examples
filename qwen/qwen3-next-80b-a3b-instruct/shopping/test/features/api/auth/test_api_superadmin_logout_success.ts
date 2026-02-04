import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_superadmin_logout_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  typia.assert(superAdmin);
  // Step 2: Verify session is valid by calling logout endpoint (authenticated endpoint)
  // This should return 204 (success) because we're authenticated
  await api.functional.shoppingMall.superAdmin.auth.superAdmins.logout(
    superAdminConnection,
  );
  // Step 3: Call logout endpoint again to terminate the session
  await api.functional.shoppingMall.superAdmin.auth.superAdmins.logout(
    superAdminConnection,
  );
  // Step 4: Attempt to call logout endpoint again with the same connection (same token)
  // This should fail with 401 Unauthorized because the session was revoked and token blacklisted
  await TestValidator.error(
    "session should be revoked after logout",
    async () => {
      await api.functional.shoppingMall.superAdmin.auth.superAdmins.logout(
        superAdminConnection,
      );
    },
  );
}
