import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_with_expired_revoked_token(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the behavior of the token refresh operation when using an expired or revoked refresh token.
  // First, simulate seller registration and a valid refresh token issuance.
  // Then simulate or mock the refresh token as expired or revoked.
  // Attempt to refresh tokens with this invalid refresh token and verify the operation fails with appropriate error response (e.g., unauthorized or forbidden).
  // This ensures security by blocking token reuse and enforcing session expiration policies.
  // 1. Register a new seller to obtain a valid authorized session including refresh token
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // 2. Use an expired or revoked refresh token - simulate with an invalid token string
  const invalidRefreshToken = "invalid_or_expired_refresh_token_example";
  // 3. Attempt to refresh tokens with invalid token and expect failure
  await TestValidator.httpError(
    "refresh with expired or revoked token should fail",
    [401, 403],
    async () => {
      // We create a new connection for refresh and manually set invalid refresh token in authorization header
      const refreshConnection: api.IConnection = {
        host: connection.host,
        headers: { Authorization: `Bearer ${invalidRefreshToken}` },
      };
      // Call refresh directly with empty body since IShoppingMallSeller.IRefresh is empty
      await api.functional.shoppingMall.auth.seller.refresh(refreshConnection, {
        body: {},
      });
    },
  );
}
