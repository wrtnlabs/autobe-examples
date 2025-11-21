import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_token_refresh_expired_token(
  connection: api.IConnection,
) {
  /**
   * Test token refresh rejection with expired refresh tokens.
   *
   * This test validates proper authentication security by ensuring that expired
   * or invalid refresh tokens are rejected, requiring sellers to
   * re-authenticate. Maintains security standards by preventing unauthorized
   * access with stale credentials and provides clear error handling for expired
   * session scenarios.
   *
   * Business Context:
   *
   * - Refresh tokens have limited lifetimes for security
   *
   *   - Expired tokens must be rejected to prevent unauthorized access
   *   - Clear error messages guide sellers to re-authenticate properly
   *   - Protects business dashboard and seller account security
   *
   * Steps:
   *
   * 1. Test with random generated token (business-level invalid token)
   * 2. Test with empty token (edge case)
   * 3. Test with invalid UUID format (malformed token)
   * 4. Verify token refresh functionality with simulated environment
   */

  // Test 1: Attempt refresh with expired/invalid token (random UUID as business-level invalid token)
  const invalidRefreshToken = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "expired refresh token should reject authentication",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );

  // Test 2: Attempt refresh with empty refresh token (business edge case)
  await TestValidator.error(
    "empty refresh token should be rejected",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );

  // Test 3: Attempt refresh with malformed token (invalid UUID format)
  const malformedToken = typia.random<
    string & tags.MinLength<30> & tags.MaxLength<50>
  >();
  await TestValidator.error(
    "malformed refresh token should be rejected",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: {
          refresh_token: malformedToken,
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );

  // Test 4: Verify token refresh accepts valid token types in simulation mode
  const validFormatToken = typia.random<string & tags.Format<"uuid">>();
  const refreshRequest = {
    body: {
      refresh_token: validFormatToken,
    } satisfies IShoppingMallSeller.IRefresh,
  };

  // In simulation mode, random valid tokens should be accepted
  if (connection.simulate) {
    const authorizedSeller = await api.functional.auth.seller.refresh(
      connection,
      refreshRequest,
    );
    typia.assert(authorizedSeller);
    TestValidator.predicate(
      "valid refresh token format should return authorized seller",
      authorizedSeller.id !== null && authorizedSeller.token !== null,
    );
  }
}
