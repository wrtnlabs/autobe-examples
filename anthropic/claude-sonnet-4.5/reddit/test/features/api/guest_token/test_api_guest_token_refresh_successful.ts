import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test successful token refresh workflow for guest accounts.
 *
 * This test validates the complete JWT token refresh lifecycle for guest users.
 * The process begins by creating a new guest account to obtain initial
 * authentication tokens, then uses the refresh token to request new
 * credentials. The test confirms that token rotation works correctly, with new
 * tokens being issued while maintaining session continuity and user profile
 * consistency.
 *
 * Steps:
 *
 * 1. Register a new guest account and capture initial tokens
 * 2. Extract the refresh token from the initial authorization response
 * 3. Call the token refresh endpoint with the refresh token
 * 4. Verify new tokens are issued and differ from original tokens
 * 5. Confirm user profile data remains unchanged after refresh
 * 6. Validate token expiration timestamps are properly updated
 */
export async function test_api_guest_token_refresh_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new guest account to obtain initial tokens
  const guestRegistration = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const initialGuest: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestRegistration,
    });
  typia.assert(initialGuest);

  // Store initial token values for comparison
  const originalAccessToken = initialGuest.token.access;
  const originalRefreshToken = initialGuest.token.refresh;
  const originalExpiredAt = initialGuest.token.expired_at;
  const originalRefreshableUntil = initialGuest.token.refreshable_until;

  // Step 2: Use the refresh token to obtain new credentials
  const refreshedGuest: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IRedditCommunityGuest.IRefresh,
    });
  typia.assert(refreshedGuest);

  // Step 3: Validate token rotation - new tokens should differ from original
  TestValidator.notEquals(
    "access token should be rotated",
    refreshedGuest.token.access,
    originalAccessToken,
  );

  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshedGuest.token.refresh,
    originalRefreshToken,
  );

  // Step 4: Verify expiration timestamps are updated
  TestValidator.predicate(
    "new access token expiration should be later than original",
    new Date(refreshedGuest.token.expired_at).getTime() >=
      new Date(originalExpiredAt).getTime(),
  );

  TestValidator.predicate(
    "new refresh token validity should be extended",
    new Date(refreshedGuest.token.refreshable_until).getTime() >=
      new Date(originalRefreshableUntil).getTime(),
  );

  // Step 5: Verify guest profile information remains unchanged
  TestValidator.equals(
    "guest ID unchanged",
    refreshedGuest.id,
    initialGuest.id,
  );
  TestValidator.equals(
    "username unchanged",
    refreshedGuest.username,
    initialGuest.username,
  );
  TestValidator.equals(
    "email unchanged",
    refreshedGuest.email,
    initialGuest.email,
  );
  TestValidator.equals(
    "display name unchanged",
    refreshedGuest.display_name,
    initialGuest.display_name,
  );
  TestValidator.equals("bio unchanged", refreshedGuest.bio, initialGuest.bio);
  TestValidator.equals(
    "avatar URL unchanged",
    refreshedGuest.avatar_url,
    initialGuest.avatar_url,
  );
  TestValidator.equals(
    "post karma unchanged",
    refreshedGuest.post_karma,
    initialGuest.post_karma,
  );
  TestValidator.equals(
    "comment karma unchanged",
    refreshedGuest.comment_karma,
    initialGuest.comment_karma,
  );
  TestValidator.equals(
    "show online status unchanged",
    refreshedGuest.show_online_status,
    initialGuest.show_online_status,
  );
  TestValidator.equals(
    "show subscribed communities unchanged",
    refreshedGuest.show_subscribed_communities,
    initialGuest.show_subscribed_communities,
  );
  TestValidator.equals(
    "show activity feed unchanged",
    refreshedGuest.show_activity_feed,
    initialGuest.show_activity_feed,
  );
}
