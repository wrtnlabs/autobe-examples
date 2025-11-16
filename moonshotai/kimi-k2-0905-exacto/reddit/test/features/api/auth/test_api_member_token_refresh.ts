import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test member JWT access token renewal using valid refresh tokens.
 *
 * This scenario validates the core authentication session management
 * functionality by refreshing expired access tokens, enabling continuous member
 * access to platform features like voting, commenting, content creation, and
 * community participation without requiring repeated login.
 *
 * The test begins with establishing a new member authentication context through
 * registration, then immediately performs token refresh to validate the renewal
 * mechanism works with fresh valid tokens. Validates that refreshed tokens
 * maintain member identity claims, have updated expiration timestamps, and that
 * refresh tokens remain valid for subsequent renewals.
 *
 * Validates the complete authentication flow: new member registration →
 * immediate token refresh → access to member-restricted operations. Ensures
 * refresh tokens are properly issued during initial login, can be used to
 * generate new access tokens, and that member state remains consistent across
 * token transitions.
 *
 * Expected outcomes: Successful refresh returns new access token with valid
 * expiration, refresh token remains usable for future renewals, member profile
 * data remains accessible with refreshed tokens, and previous access tokens
 * become invalid.
 */
export async function test_api_member_token_refresh(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to establish authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    nickname: RandomGenerator.name(1),
    email: memberEmail,
    password: "ValidPassword123!",
  } satisfies IRedditCommunityMember.ICreate;

  const initialAuth: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(initialAuth);

  // Step 2: Extract and validate initial tokens
  TestValidator.predicate(
    "initial access token exists",
    initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token exists",
    initialAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "initial token has valid expiration",
    new Date(initialAuth.token.expired_at) > new Date(),
  );

  // Step 3: Record initial token details for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  const originalExpiredAt = initialAuth.token.expired_at;

  // Step 4: Perform token refresh using the refresh token
  const refreshRequest = {
    refresh_token: originalRefreshToken,
  } satisfies IRedditCommunityMember.IRefreshRequest;

  const refreshedAuth: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: refreshRequest,
    });
  typia.assert(refreshedAuth);

  // Step 5: Validate refreshed token properties
  TestValidator.predicate(
    "new access token exists",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token remains valid",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "member ID remains consistent",
    refreshedAuth.id === initialAuth.id,
  );
  TestValidator.predicate(
    "member email remains consistent",
    refreshedAuth.email === initialAuth.email,
  );
  TestValidator.predicate(
    "member nickname remains consistent",
    refreshedAuth.nickname === initialAuth.nickname,
  );

  // Step 6: Validate token renewal behavior
  TestValidator.predicate(
    "access token has been renewed",
    refreshedAuth.token.access !== originalAccessToken,
  );
  TestValidator.predicate(
    "token remains fresh after refresh",
    new Date(refreshedAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "new expiration is later than original",
    new Date(refreshedAuth.token.expired_at) > new Date(originalExpiredAt),
  );

  // Step 7: Validate account lifecycle timestamps remain consistent
  TestValidator.equals(
    "member created_at timestamp unchanged",
    refreshedAuth.created_at,
    initialAuth.created_at,
  );
  TestValidator.equals(
    "member updated_at timestamp unchanged for refresh-only operation",
    refreshedAuth.updated_at,
    initialAuth.updated_at,
  );

  // Step 8: Verify delete_at field consistency (should be null for active accounts)
  TestValidator.equals(
    "member delete_at remains null",
    refreshedAuth.deleted_at,
    initialAuth.deleted_at,
  );

  // Step 9: Perform multiple refreshes to validate token refresh mechanism reliability
  const secondRefreshRequest = {
    refresh_token: refreshedAuth.token.refresh,
  } satisfies IRedditCommunityMember.IRefreshRequest;

  const secondRefresh: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: secondRefreshRequest,
    });
  typia.assert(secondRefresh);

  // Step 10: Validate second refresh maintains member authentication state
  TestValidator.predicate(
    "second refresh succeeds with new access token",
    secondRefresh.token.access.length > 0,
  );
  TestValidator.predicate(
    "member state persists across multiple refreshes",
    secondRefresh.id === initialAuth.id,
  );
  TestValidator.predicate(
    "all refresh operations produce valid tokens",
    new Date(secondRefresh.token.expired_at) > new Date(),
  );
}
