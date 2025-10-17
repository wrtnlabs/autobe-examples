import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

/**
 * Test successful guest user token refresh.
 *
 * Validates that a guest user can refresh their access token using a valid
 * refresh token. Verifies that the new access token has the correct structure,
 * contains user information, and has the expected 15-minute expiration time.
 *
 * Test flow:
 *
 * 1. Create guest user account to obtain initial tokens
 * 2. Extract refresh token from initial authorization response
 * 3. Call token refresh endpoint with valid refresh token
 * 4. Validate new access token structure and expiration (900 seconds)
 * 5. Verify token contains correct user ID and authorization metadata
 * 6. Confirm tokenType is "Bearer" and expiresIn is 900 seconds
 * 7. Verify optional token rotation for security
 */
export async function test_api_guest_user_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create guest user account
  const email = typia.random<string & tags.Format<"email">>();
  const password =
    RandomGenerator.alphabets(8) +
    RandomGenerator.alphabets(1).toUpperCase() +
    "1" +
    "!";

  const initialAuth: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoAppGuestUser.IJoin,
    });
  typia.assert(initialAuth);

  // Validate initial authorization response contains token information
  TestValidator.predicate(
    "initial auth has user ID",
    initialAuth.id.length > 0,
  );
  TestValidator.predicate(
    "initial auth has access token",
    initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial auth has refresh token for next refresh",
    initialAuth.refreshToken !== undefined &&
      initialAuth.refreshToken.length > 0,
  );

  // Step 2: Extract refresh token
  const refreshToken = initialAuth.refreshToken!;

  // Step 3: Call token refresh endpoint
  const refreshedAuth: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ITodoAppGuestUser.IRefresh,
    });
  typia.assert(refreshedAuth);

  // Step 4: Validate new authorization response maintains user identity
  TestValidator.equals(
    "refreshed auth has same user ID",
    refreshedAuth.id,
    initialAuth.id,
  );

  // Step 5: Validate new access token structure
  const newToken: IAuthorizationToken = refreshedAuth.token;
  typia.assert(newToken);

  TestValidator.predicate(
    "new access token is a valid JWT with 3 parts",
    (newToken.access.match(/\./g) || []).length === 2,
  );

  // Step 6: Validate token expiration timestamps are ISO datetime format
  TestValidator.predicate(
    "expired_at is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(newToken.expired_at),
  );

  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(newToken.refreshable_until),
  );

  // Step 7: Verify token metadata
  TestValidator.equals(
    "token type is Bearer for authorization header usage",
    refreshedAuth.tokenType,
    "Bearer",
  );

  TestValidator.equals(
    "token expiration is 15 minutes (900 seconds)",
    refreshedAuth.expiresIn,
    900,
  );

  // Step 8: Verify optional refresh token rotation
  if (refreshedAuth.refreshToken) {
    TestValidator.predicate(
      "rotated refresh token is not empty",
      refreshedAuth.refreshToken.length > 0,
    );

    TestValidator.notEquals(
      "refresh token was rotated for security (different from original)",
      refreshedAuth.refreshToken,
      refreshToken,
    );
  }
}
