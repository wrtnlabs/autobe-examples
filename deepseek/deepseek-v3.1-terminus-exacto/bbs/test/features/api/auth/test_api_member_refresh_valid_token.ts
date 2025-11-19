import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful token refresh for an authenticated member using a valid
 * refresh token.
 *
 * This test validates that members can extend their session duration without
 * re-authentication by providing a valid refresh token. The test creates a new
 * member account, obtains initial authentication tokens, then uses the refresh
 * token to obtain new tokens with extended validity. Validates that the refresh
 * operation returns new access and refresh tokens with updated expiration
 * timestamps while maintaining the member's identity information.
 */
export async function test_api_member_refresh_valid_token(
  connection: api.IConnection,
) {
  // 1. Create a new member account to obtain initial authentication tokens
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const joinData = {
    email: memberEmail,
    username: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 8,
    }),
    password: "ValidPassword123",
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "192.168.1.1",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardMember.ICreate;

  const initialMember = await api.functional.auth.member.join(connection, {
    body: joinData,
  });
  typia.assert(initialMember);

  // 2. Extract the refresh token from the initial authentication response
  const refreshToken = initialMember.token.refresh;
  typia.assert<string>(refreshToken);

  // 3. Use the refresh token to call the refresh endpoint and obtain new tokens
  const refreshData = {
    refresh_token: refreshToken,
  } satisfies IDiscussionBoardMember.IRefresh;

  const refreshedMember = await api.functional.auth.member.refresh(connection, {
    body: refreshData,
  });
  typia.assert(refreshedMember);

  // 4. Validate that the refresh operation returns valid member data with new tokens
  TestValidator.equals(
    "member ID should remain consistent",
    refreshedMember.id,
    initialMember.id,
  );
  TestValidator.equals(
    "member email should remain consistent",
    refreshedMember.email,
    initialMember.email,
  );
  TestValidator.equals(
    "member username should remain consistent",
    refreshedMember.username,
    initialMember.username,
  );
  TestValidator.equals(
    "member display_name should remain consistent",
    refreshedMember.display_name,
    initialMember.display_name,
  );
  TestValidator.equals(
    "member bio should remain consistent",
    refreshedMember.bio,
    initialMember.bio,
  );

  // 5. Verify that new tokens are different from initial tokens
  TestValidator.notEquals(
    "access token should be refreshed",
    refreshedMember.token.access,
    initialMember.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be refreshed",
    refreshedMember.token.refresh,
    initialMember.token.refresh,
  );

  // 6. Verify that expiration timestamps are updated and extended
  TestValidator.notEquals(
    "token expiration should be updated",
    refreshedMember.token.expired_at,
    initialMember.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable until should be updated",
    refreshedMember.token.refreshable_until,
    initialMember.token.refreshable_until,
  );

  // 7. Validate that refresh operation extends session validity
  const initialExpiredAt = new Date(initialMember.token.expired_at);
  const refreshedExpiredAt = new Date(refreshedMember.token.expired_at);
  TestValidator.predicate(
    "refreshed token should have later expiration",
    refreshedExpiredAt > initialExpiredAt,
  );

  const initialRefreshableUntil = new Date(
    initialMember.token.refreshable_until,
  );
  const refreshedRefreshableUntil = new Date(
    refreshedMember.token.refreshable_until,
  );
  TestValidator.predicate(
    "refreshed token should have later refreshable period",
    refreshedRefreshableUntil > initialRefreshableUntil,
  );
}
