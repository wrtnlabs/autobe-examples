import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token refresh behavior with invalid refresh token.
 *
 * This test validates that the JWT token refresh endpoint properly rejects
 * invalid or malformed refresh tokens. When a completely invalid token string
 * (not a valid JWT format) is provided, the endpoint should reject the request
 * with an appropriate error response without generating new tokens.
 *
 * Test Steps:
 *
 * 1. Generate an invalid refresh token (random string, not JWT format)
 * 2. Attempt to call the refresh endpoint with the invalid token
 * 3. Verify the API properly rejects the request with an error
 * 4. Confirm no valid tokens are generated
 *
 * This ensures the endpoint validates token format and structure before
 * attempting database lookups or token generation, providing proper security
 * validation.
 */
export async function test_api_user_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // Generate a completely invalid refresh token (not JWT format)
  const invalidRefreshToken = RandomGenerator.alphaNumeric(32);

  // Attempt to refresh with invalid token - should fail
  await TestValidator.error(
    "refresh should fail with invalid token format",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );
}
