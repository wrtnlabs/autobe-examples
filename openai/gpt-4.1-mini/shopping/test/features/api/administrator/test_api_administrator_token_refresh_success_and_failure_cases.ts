import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_token_refresh_success_and_failure_cases(
  connection: api.IConnection,
): Promise<void> {
  // Test administrator token refresh success and failure cases.
  /*
   * 1. Successful token refresh with a valid refresh token.
   *    - Register a new administrator.
   *    - Use the issued refresh token to refresh tokens.
   *    - Validate new tokens and administrator info.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate join body with valid admin join data
  const joinBody = typia.random<IShoppingMallAdministrator.IJoin>();
  // Register admin and get authorized result with tokens
  const authorized = await authorize_administrator_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  adminConnection.headers = { Authorization: authorized.token.access };
  // Refresh token using valid refresh token
  const refreshResponse = await authorize_administrator_refresh(
    adminConnection,
    {
      body: {
        refresh: authorized.token.refresh,
      } as IShoppingMallAdministrator.IRefresh,
    },
  );
  typia.assert(refreshResponse);
  TestValidator.predicate(
    "new access token is different from old",
    refreshResponse.token.access !== authorized.token.access,
  );
  TestValidator.predicate(
    "new refresh token is different from old",
    refreshResponse.token.refresh !== authorized.token.refresh,
  );
  /*
   * 2. Attempt token refresh with expired refresh token.
   *  - Simulate expired token usage by passing a clearly expired token string.
   *  - Expect authorization failure when refreshing.
   */
  const expiredAdminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(expiredAdminConnection, {
    body: joinBody,
  });
  await TestValidator.error(
    "token refresh failure with expired token",
    async () => {
      await authorize_administrator_refresh(expiredAdminConnection, {
        body: {
          refresh: "expired_refresh_token",
        } as IShoppingMallAdministrator.IRefresh,
      });
    },
  );
  /*
   * 3. Attempt token refresh with invalid refresh token.
   *  - Use clearly invalid token string.
   *  - Expect authorization failure.
   */
  const invalidAdminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(invalidAdminConnection, {
    body: joinBody,
  });
  await TestValidator.error(
    "token refresh failure with invalid token",
    async () => {
      await authorize_administrator_refresh(invalidAdminConnection, {
        body: {
          refresh: "invalid_refresh_token",
        } as IShoppingMallAdministrator.IRefresh,
      });
    },
  );
}
