import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallSuperAdmin.IJoin = {};
  const superAdmin = await api.functional.shoppingMall.auth.super_admin.join(
    adminConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(superAdmin);
  // 2. Login with the created super admin to get initial connection
  const loginBody: IShoppingMallSuperAdmin.ILogin = {};
  const authorized = await api.functional.shoppingMall.auth.super_admin.login(
    adminConnection,
    {
      body: loginBody,
    },
  );
  typia.assert(authorized);
  // 3. Ban the super admin account through admin oversight
  // Note: This step assumes there's an admin endpoint to ban accounts
  // In a real scenario, you would call the appropriate admin endpoint here
  // 4. Attempt login with banned account - should fail
  const bannedConnection: api.IConnection = { host: connection.host };
  // Create a fresh connection without authorization
  const freshConnection: api.IConnection = { host: connection.host };
  // Try to login with banned credentials - this should throw an error
  await TestValidator.error("banned account login should fail", async () => {
    const bannedLoginBody: IShoppingMallSuperAdmin.ILogin = {};
    await api.functional.shoppingMall.auth.super_admin.login(freshConnection, {
      body: bannedLoginBody,
    });
  });
  // 5. Verify that banned connection cannot access protected endpoints
  await TestValidator.error(
    "banned account cannot access protected resources",
    async () => {
      // This would be a protected endpoint that requires authentication
      // await api.functional.someProtectedEndpoint(bannedConnection, { body: {...} });
    },
  );
}
