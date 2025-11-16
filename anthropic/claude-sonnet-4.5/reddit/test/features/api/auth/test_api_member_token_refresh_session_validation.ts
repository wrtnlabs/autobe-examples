import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that token refresh properly validates the refresh token against active
 * sessions.
 *
 * This test validates secure token rotation mechanics by:
 *
 * 1. Creating a new member account to obtain initial authentication tokens
 * 2. Successfully refreshing tokens once using the initial refresh token
 * 3. Attempting to reuse the old (invalidated) refresh token
 * 4. Verifying that the system properly rejects the reused refresh token
 *
 * This ensures that only the most recent refresh token is valid and that old
 * refresh tokens are properly invalidated upon successful refresh, preventing
 * token reuse attacks and maintaining secure session management.
 */
export async function test_api_member_token_refresh_session_validation(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to obtain initial authentication tokens
  const registrationData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const initialMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(initialMember);

  // Store the initial refresh token
  const initialRefreshToken: string = initialMember.token.refresh;

  // Step 2: Successfully refresh tokens using the initial refresh token
  const firstRefreshedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IRedditCommunityGuest.IRefresh,
    });
  typia.assert(firstRefreshedMember);

  // Verify that new tokens were issued
  TestValidator.predicate(
    "first refresh should return new access token",
    firstRefreshedMember.token.access !== initialMember.token.access,
  );
  TestValidator.predicate(
    "first refresh should return new refresh token",
    firstRefreshedMember.token.refresh !== initialRefreshToken,
  );

  // Verify member data consistency
  TestValidator.equals(
    "member ID should remain the same after refresh",
    firstRefreshedMember.id,
    initialMember.id,
  );
  TestValidator.equals(
    "member username should remain the same after refresh",
    firstRefreshedMember.username,
    initialMember.username,
  );

  // Step 3: Attempt to reuse the old (invalidated) refresh token
  await TestValidator.error(
    "reused refresh token should be rejected",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IRedditCommunityGuest.IRefresh,
      });
    },
  );

  // Step 4: Verify that the new refresh token still works
  const secondRefreshedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: firstRefreshedMember.token.refresh,
      } satisfies IRedditCommunityGuest.IRefresh,
    });
  typia.assert(secondRefreshedMember);

  // Verify that the second refresh also issues new tokens
  TestValidator.predicate(
    "second refresh should return new access token",
    secondRefreshedMember.token.access !== firstRefreshedMember.token.access,
  );
  TestValidator.predicate(
    "second refresh should return new refresh token",
    secondRefreshedMember.token.refresh !== firstRefreshedMember.token.refresh,
  );

  // Verify member data consistency after second refresh
  TestValidator.equals(
    "member ID should remain consistent",
    secondRefreshedMember.id,
    initialMember.id,
  );
}
