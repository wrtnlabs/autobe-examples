import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Verifies that the /auth/seller/refresh API enforces expiration for refresh
 * tokens.
 *
 * This test attempts to use an expired refresh token to obtain new access
 * credentials for a seller. It confirms that the backend correctly rejects
 * expired refresh tokens and does not return a new token pair.
 *
 * Steps:
 *
 * 1. Generate a realistic expired refresh token string (e.g., a random string).
 * 2. Prepare a valid IShoppingMallSeller.IRefresh request body with the expired
 *    token.
 * 3. Attempt to refresh seller tokens using the expired token.
 * 4. Confirm that the operation fails (error is thrown and no new token is
 *    issued).
 * 5. Optionally, ensure the error is due to expiration, not missing/invalid
 *    format.
 */
export async function test_api_seller_token_refresh_with_expired_token(
  connection: api.IConnection,
) {
  // 1. Generate an explicit expired refresh token.
  const expired_refresh_token = RandomGenerator.alphaNumeric(64);

  // 2. Create request body using the expired token.
  const requestBody = {
    refresh_token: expired_refresh_token,
  } satisfies IShoppingMallSeller.IRefresh;

  // 3. Attempt to refresh and expect failure.
  await TestValidator.error(
    "should not allow refresh with expired refresh token",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: requestBody,
      });
    },
  );
}
