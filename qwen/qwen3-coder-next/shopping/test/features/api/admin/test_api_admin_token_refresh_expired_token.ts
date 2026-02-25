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

export async function test_api_admin_token_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinEmail: string & tags.MaxLength<255> & tags.Format<"email"> =
    typia.random<string & tags.MaxLength<255> & tags.Format<"email">>();
  const joinInput: IShoppingMallAdmin.IJoin = {
    email: joinEmail,
    password: "TestPassword123!" satisfies string & tags.Format<"password">,
  };
  const registeredAdmin: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: joinInput,
    });
  typia.assert(registeredAdmin);
  // Step 2: Login with the admin credentials
  const loginInput: IShoppingMallAdmin.ILogin = {
    email: joinEmail,
    password: "TestPassword123!" satisfies string & tags.Format<"password">,
  };
  const loggedAdmin: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_login(adminConnection, {
      body: loginInput,
    });
  typia.assert(loggedAdmin);
  // Step 3: Wait for the refresh token to expire (7 days)
  // The refresh token expires after 7 days (604800000 milliseconds)
  const refreshExpirationTimeMs: number = 604800000; // 7 days in milliseconds
  await new Promise((resolve) => setTimeout(resolve, refreshExpirationTimeMs));
  // Step 4: Attempt to refresh with the expired token
  // The token should be expired now
  await TestValidator.error(
    "expired refresh token should be rejected",
    async () => {
      await api.functional.shoppingMall.auth.admin.refresh(adminConnection, {
        body: {
          refreshToken: loggedAdmin.refresh_token,
        } satisfies IShoppingMallAdmin.IRefresh,
      });
    },
  );
}
