import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const registerEmail = typia.random<string & tags.Format<"email">>();
  const registeredAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: registerEmail,
      password: "TestPass123!",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(registeredAdmin);
  // Step 2: Login to obtain initial tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedAdmin = await authorize_admin_login(loginConnection, {
    body: {
      email: (registerEmail satisfies string as string) as string & tags.MaxLength<255> & tags.Format<"email">,
      password: "TestPass123!",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(loggedAdmin);
  // Step 3: Use the refresh token to get new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAdmin = await authorize_admin_refresh(refreshConnection, {
    body: {
      refreshToken: loggedAdmin.refresh_token,
    } satisfies IShoppingMallAdmin.IRefresh,
  });
  typia.assert(refreshedAdmin);
  // Step 4: Validate the refresh response
  TestValidator.equals("admin ID matches", refreshedAdmin.id, loggedAdmin.id);
  TestValidator.equals(
    "email matches",
    refreshedAdmin.email,
    loggedAdmin.email,
  );
  TestValidator.equals(
    "access token is fresh",
    refreshedAdmin.access_token.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token is fresh",
    refreshedAdmin.refresh_token.length > 0,
    true,
  );
  TestValidator.equals(
    "access token is different",
    refreshedAdmin.access_token !== loggedAdmin.access_token,
    true,
  );
  TestValidator.equals(
    "refresh token is different",
    refreshedAdmin.refresh_token !== loggedAdmin.refresh_token,
    true,
  );
  TestValidator.predicate("access token expires in future", () => {
    const now = new Date();
    const expiry = new Date(refreshedAdmin.access_expired_at);
    return expiry > now;
  });
  TestValidator.predicate("refresh token expires in future", () => {
    const now = new Date();
    const expiry = new Date(refreshedAdmin.refresh_expired_at);
    return expiry > now;
  });
}