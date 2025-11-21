import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful token refresh for an authenticated member user.
 *
 * This test validates that a member with valid authentication credentials can
 * refresh their access token to extend their session duration. The test
 * establishes a new member account through registration, performs initial
 * authentication, and then tests the refresh operation to ensure proper token
 * renewal with updated expiration timestamps and continued access to platform
 * features.
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Create a new member account for authentication testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Establish initial authentication session
  const loginResult = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginResult);

  // 3. Execute token refresh operation
  const refreshResult = await api.functional.auth.member.refresh(connection, {
    body: {
      community_platform_member_id: member.id,
    } satisfies ICommunityPlatformMember.IRefresh,
  });
  typia.assert(refreshResult);

  // 4. Validate refresh operation results
  TestValidator.equals(
    "member ID remains consistent",
    refreshResult.id,
    loginResult.id,
  );
  TestValidator.equals(
    "email remains consistent",
    refreshResult.email,
    loginResult.email,
  );
  TestValidator.equals(
    "display name remains consistent",
    refreshResult.display_name,
    loginResult.display_name,
  );

  // 5. Validate token structure and expiration
  TestValidator.predicate(
    "access token is provided",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is provided",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO date",
    new Date(refreshResult.token.expired_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date",
    new Date(refreshResult.token.refreshable_until).toString() !==
      "Invalid Date",
  );

  // 6. Verify that refreshed tokens are different from original tokens
  TestValidator.notEquals(
    "access token is renewed",
    refreshResult.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token is renewed",
    refreshResult.token.refresh,
    loginResult.token.refresh,
  );
  TestValidator.notEquals(
    "expiration timestamp is updated",
    refreshResult.token.expired_at,
    loginResult.token.expired_at,
  );

  // 7. Validate that expiration timestamps are in the future
  const currentTime = new Date();
  const refreshedExpiredAt = new Date(refreshResult.token.expired_at);
  const refreshedRefreshableUntil = new Date(
    refreshResult.token.refreshable_until,
  );

  TestValidator.predicate(
    "refreshed access token expiration is in the future",
    refreshedExpiredAt > currentTime,
  );
  TestValidator.predicate(
    "refreshed refresh token expiration is in the future",
    refreshedRefreshableUntil > currentTime,
  );

  // 8. Validate that refresh actually extends the session
  const originalExpiredAt = new Date(loginResult.token.expired_at);
  TestValidator.predicate(
    "refresh extends access token expiration",
    refreshedExpiredAt > originalExpiredAt,
  );
}
