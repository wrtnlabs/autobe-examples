import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionGuestUser";

/**
 * Validate successful token refresh operation for authenticated guest users.
 *
 * This test ensures guest users can extend their session without
 * re-authentication by providing valid refresh tokens. The test validates that
 * new access and refresh tokens are generated properly while maintaining user
 * session integrity.
 *
 * Test flow:
 *
 * 1. Create guest user account with join endpoint to obtain initial tokens
 * 2. Call token refresh endpoint to extend session without re-authentication
 * 3. Validate response contains updated user profile and new token pair
 * 4. Verify token refresh maintains authenticated user context
 */
export async function test_api_guest_user_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create guest user account to obtain initial refresh token
  const guestUser: IEconPoliticalDiscussionGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
    });
  typia.assert(guestUser);

  // Validate initial user creation and token structure
  TestValidator.equals(
    "guest user account created successfully",
    guestUser.status,
    "active",
  );
  TestValidator.equals(
    "initial access token provided",
    !!guestUser.token.access,
    true,
  );
  TestValidator.equals(
    "initial refresh token provided",
    !!guestUser.token.refresh,
    true,
  );
  TestValidator.equals(
    "access token has expiration",
    !!guestUser.token.expired_at,
    true,
  );
  TestValidator.equals(
    "refresh token has expiration",
    !!guestUser.token.refreshable_until,
    true,
  );

  // Step 2: Test token refresh operation using the refresh token
  const refreshedUser: IEconPoliticalDiscussionGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh.refreshToken(connection);
  typia.assert(refreshedUser);

  // Step 3: Validate token refresh response and user session integrity
  TestValidator.equals(
    "user profile preserved after refresh",
    refreshedUser.id,
    guestUser.id,
  );
  TestValidator.equals(
    "user display name preserved",
    refreshedUser.display_name,
    guestUser.display_name,
  );
  TestValidator.equals(
    "user email preserved",
    refreshedUser.email,
    guestUser.email,
  );
  TestValidator.equals(
    "user status remains active",
    refreshedUser.status,
    "active",
  );

  // Step 4: Validate new token pair generation
  TestValidator.equals(
    "new access token generated",
    !!refreshedUser.token.access,
    true,
  );
  TestValidator.equals(
    "new refresh token generated",
    !!refreshedUser.token.refresh,
    true,
  );
  TestValidator.equals(
    "access token expiration updated",
    !!refreshedUser.token.expired_at,
    true,
  );
  TestValidator.equals(
    "refresh token expiration updated",
    !!refreshedUser.token.refreshable_until,
    true,
  );

  // Step 5: Ensure tokens are different (indicating successful refresh)
  TestValidator.notEquals(
    "access token was refreshed",
    refreshedUser.token.access,
    guestUser.token.access,
  );
  TestValidator.notEquals(
    "refresh token was refreshed",
    refreshedUser.token.refresh,
    guestUser.token.refresh,
  );

  // Step 6: Validate token structure and format
  const accessTokenParts = refreshedUser.token.access.split(".");
  TestValidator.equals(
    "access token has JWT format",
    accessTokenParts.length,
    3,
  );

  const refreshTokenParts = refreshedUser.token.refresh.split(".");
  TestValidator.equals(
    "refresh token has JWT format",
    refreshTokenParts.length,
    3,
  );

  // Step 7: Verify refreshed tokens have proper expiration timing
  const newExpiryTime = new Date(refreshedUser.token.expired_at).getTime();
  const oldExpiryTime = new Date(guestUser.token.expired_at).getTime();
  TestValidator.predicate(
    "new access token expires later than old one",
    newExpiryTime > oldExpiryTime,
  );

  const newRefreshExpiryTime = new Date(
    refreshedUser.token.refreshable_until,
  ).getTime();
  const oldRefreshExpiryTime = new Date(
    guestUser.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "new refresh token expires later than old one",
    newRefreshExpiryTime > oldRefreshExpiryTime,
  );
}
