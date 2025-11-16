import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test token refresh behavior with an invalid refresh token.
 *
 * This test validates the security of the seller token refresh mechanism by
 * attempting to refresh tokens using a completely invalid refresh token string
 * that doesn't correspond to any active session.
 *
 * The test ensures that:
 *
 * 1. The system properly rejects invalid refresh tokens
 * 2. No new access or refresh tokens are issued for invalid requests
 * 3. The API returns an appropriate error response
 *
 * Steps:
 *
 * 1. Generate an invalid/malformed refresh token string
 * 2. Attempt to call the refresh API with the invalid token
 * 3. Verify that the operation fails (throws an error)
 * 4. Confirm no tokens are issued on failure
 */
export async function test_api_seller_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Generate a completely invalid refresh token string
  // This could be a random string, malformed JWT, or any invalid format
  const invalidRefreshToken = RandomGenerator.alphaNumeric(64);

  // Attempt to refresh tokens with the invalid token
  // This should fail and throw an error
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );
}
