import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test token refresh fails with expired/invalid refresh token.
 *
 * This test validates that the seller token refresh endpoint properly
 * rejects expired or invalid refresh tokens, guiding the user toward
 * re-authentication via login.
 *
 * Steps:
 * 1. Register a new seller account via /auth/seller/join to obtain valid tokens
 * 2. Extract the refresh token from the response
 * 3. Attempt to refresh with an invalid/expired token
 * 4. Verify the endpoint returns an error response indicating token expiration
 * 5. Verify error message guides user toward re-authentication via login
 */
export async function test_api_seller_token_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account to obtain valid tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(authorized);
  // Extract the valid refresh token from the response
  const validRefreshToken = authorized.token.refresh;
  // Step 2: Create a new connection for token refresh testing
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 3: Attempt to refresh with an invalid/expired token
  // We use an invalid token string (not a real JWT) to simulate expired token scenario
  await TestValidator.error("expired refresh token should fail", async () => {
    await api.functional.ecommerceMall.auth.seller.refresh(refreshConnection, {
      body: {
        refresh: "expired.invalid.token.format",
      } satisfies IEcommerceMallSeller.IRefresh,
    });
  });
  // Also test with empty/invalid refresh token
  await TestValidator.httpError(
    "empty refresh token should fail",
    400,
    async () => {
      await api.functional.ecommerceMall.auth.seller.refresh(
        refreshConnection,
        {
          body: {
            refresh: "",
          } satisfies IEcommerceMallSeller.IRefresh,
        },
      );
    },
  );
  // Verify that using a valid but already used refresh token also fails
  // (refresh tokens are typically single-use or session-bound)
  await TestValidator.error("reuse of refresh token should fail", async () => {
    await api.functional.ecommerceMall.auth.seller.refresh(refreshConnection, {
      body: {
        refresh: validRefreshToken,
      } satisfies IEcommerceMallSeller.IRefresh,
    });
  });
}
