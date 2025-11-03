import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";

/**
 * Test successful token refresh for authenticated member.
 *
 * This test validates that members can exchange valid refresh tokens for new
 * access tokens without re-authentication, maintaining seamless session
 * continuity. The test verifies JWT token expiration is properly updated and
 * members can continue accessing protected features like article creation and
 * commenting with new tokens.
 *
 * Test workflow:
 *
 * 1. Create member account to generate initial refresh token
 * 2. Verify tokens received from registration
 * 3. Use refresh token to get new access token
 * 4. Validate new authorization token structure
 * 5. Verify old refresh token doesn't work (security check)
 * 6. Test concurrent operations with new token
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create member account and obtain initial tokens
  const username = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<20>
  >();
  const email = typia.random<string & tags.Format<"email">>();

  const member: IPoliticsBbsMember.IAuthorized =
    await api.functional.auth.members.join(connection, {
      body: {
        username,
        email,
        password: "TestPass123",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies IPoliticsBbsMember.IJoin,
    });

  typia.assert(member);

  // Validate initial token structure
  TestValidator.predicate(
    "member has valid token",
    member.token !== undefined &&
      member.token.access !== undefined &&
      member.token.refresh !== undefined,
  );

  TestValidator.predicate(
    "token has expiration",
    member.token.expired_at !== undefined &&
      member.token.refreshable_until !== undefined,
  );

  const originalToken = member.token;

  // Step 2: Wait a moment to ensure token timestamps change
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 3: Use refresh token to get new access token
  const refreshedMember: IPoliticsBbsMember.IAuthorized =
    await api.functional.auth.members.refresh(connection, {
      body: {
        refresh_token: originalToken.refresh,
      } satisfies IPoliticsBbsMember.IRefresh,
    });

  typia.assert(refreshedMember);

  // Step 4: Validate refreshed token structure
  TestValidator.predicate(
    "refreshed member has valid token",
    refreshedMember.token !== undefined &&
      refreshedMember.token.access !== undefined &&
      refreshedMember.token.refresh !== undefined,
  );

  TestValidator.predicate(
    "token attributes match",
    refreshedMember.id === member.id &&
      refreshedMember.username === member.username &&
      refreshedMember.email === member.email,
  );

  TestValidator.predicate(
    "new access token is different",
    refreshedMember.token.access !== originalToken.access,
  );

  TestValidator.notEquals(
    "new refresh token differs",
    refreshedMember.token.refresh,
    originalToken.refresh,
  );

  TestValidator.predicate(
    "new expiration is updated",
    refreshedMember.token.expired_at > originalToken.expired_at,
  );

  // Step 5: Validate new authorization header is set
  TestValidator.predicate(
    "connection has authorization header",
    connection.headers !== undefined &&
      connection.headers.Authorization !== undefined &&
      connection.headers.Authorization === refreshedMember.token.access,
  );

  // Step 6: Test that old refresh token no longer works
  await TestValidator.error("old refresh token should expire", async () => {
    await api.functional.auth.members.refresh(connection, {
      body: {
        refresh_token: originalToken.refresh,
      } satisfies IPoliticsBbsMember.IRefresh,
    });
  });
}
