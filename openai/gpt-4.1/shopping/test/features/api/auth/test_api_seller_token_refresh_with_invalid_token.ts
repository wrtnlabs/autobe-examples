import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test token refresh attempt using a tampered or invalid refresh token.
 *
 * Ensures that the authentication system rejects attempts to refresh a JWT
 * using an invalid or forged refresh token, thereby preventing session replay
 * and forgery attacks. The test submits a random clearly-invalid refresh token
 * string and validates that an error is thrown, verifying strong server-side
 * validation and that no new authentication is granted. No login or valid
 * session setup is needed; the error condition is established with a single
 * forged request to /auth/seller/refresh.
 *
 * 1. Compose a refresh request with an intentionally invalid refresh token value
 *    (random string not associated with any real session).
 * 2. POST the request to /auth/seller/refresh and EXPECT AN ERROR.
 * 3. Assert that the error is thrown (using await TestValidator.error) and no
 *    authenticated session is established.
 */
export async function test_api_seller_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "should throw error for tampered/invalid seller refresh token",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(64),
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );
}
