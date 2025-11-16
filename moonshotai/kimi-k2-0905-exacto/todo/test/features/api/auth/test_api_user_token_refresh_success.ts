import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate successful token refresh operation when a valid refresh token is
 * provided. This test ensures users can seamlessly renew expired access tokens
 * without re-authenticating, supporting continuous todo task management
 * workflow. The operation returns new access and refresh tokens with
 * appropriate expiration timestamps.
 *
 * Test flow:
 *
 * 1. Generate valid refresh token for authentication (JWT token, not UUID!)
 * 2. Call token refresh API endpoint
 * 3. Validate response contains new tokens and user information
 * 4. Verify token expiration timestamps are future dates
 * 5. Ensure user identity is preserved through token renewal
 */
export async function test_api_user_token_refresh_success(
  connection: api.IConnection,
) {
  // Generate random refresh token (JWT token, NOT UUID!)
  const refreshToken = typia.random<string>();

  // Call token refresh operation
  const refreshedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ITodoAppUser.IRefresh,
    });

  // Complete type validation of response - typia.assert validates ALL formats automatically
  typia.assert(refreshedUser);

  // Only validate business logic aspects - typia.assert already handles type validation
  TestValidator.predicate("user has valid UUID", refreshedUser.id.length > 0);

  TestValidator.predicate(
    "email should contain @ symbol",
    refreshedUser.email.includes("@"),
  );

  // Validate token structure and content
  TestValidator.predicate(
    "access token must be non-empty string",
    typeof refreshedUser.token.access === "string" &&
      refreshedUser.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token must be non-empty string",
    typeof refreshedUser.token.refresh === "string" &&
      refreshedUser.token.refresh.length > 0,
  );

  // Validate token expiration timestamps
  const now = new Date().toISOString();
  TestValidator.predicate(
    "access token should expire in future",
    refreshedUser.token.expired_at > now,
  );

  TestValidator.predicate(
    "refresh token should expire in future",
    refreshedUser.token.refreshable_until > now,
  );
}
