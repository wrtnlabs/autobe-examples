import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test error handling when attempting to refresh a seller session using a
 * revoked or blacklisted refresh token.
 *
 * This test validates that the system properly tracks revoked sessions and
 * prevents unauthorized access using compromised tokens. The test will:
 *
 * 1. Generate a random refresh token that appears valid but is likely
 *    revoked/blacklisted
 * 2. Attempt to refresh the seller session using this token
 * 3. Verify that the system rejects the request and maintains security boundaries
 *
 * The refresh process should implement secure token rotation patterns that
 * replace refresh tokens with new ones to prevent replay attacks, and should
 * track revoked sessions for security monitoring.
 */
export async function test_api_seller_refresh_revoked_token(
  connection: api.IConnection,
) {
  // Generate a random refresh token that mimics a revoked/blacklisted token
  const revokedRefreshToken = typia.random<string & tags.Format<"uuid">>();

  // Create refresh request body with the revoked token
  const refreshRequest = {
    refresh_token: revokedRefreshToken,
  } satisfies IShoppingMallSeller.IRefresh;

  // Attempt to refresh with revoked token - should fail
  await TestValidator.error("should reject revoked refresh token", async () => {
    await api.functional.auth.seller.refresh(connection, {
      body: refreshRequest,
    });
  });
}
