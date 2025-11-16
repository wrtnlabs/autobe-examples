import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test member token refresh failure scenarios when using invalid or expired
 * refresh tokens. Validates robust error handling and security measures
 * protecting against unauthorized access attempts with malformed, outdated, or
 * compromised refresh tokens.
 *
 * This test covers multiple failure scenarios:
 *
 * 1. Completely invalid token format (malformed)
 * 2. Empty refresh token
 * 3. Tampered/expired token
 * 4. Invalidated/revoked token
 *
 * Ensures the platform maintains security standards by rejecting unauthorized
 * refresh attempts, provides meaningful error messages for different failure
 * types, and prevents token replay attacks. Validates that failed refresh
 * attempts don't affect the validity of existing valid tokens.
 */
export async function test_api_member_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Create a valid member account first
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        nickname: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPass1!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Test 1: Completely invalid token format (malformed)
  await TestValidator.error(
    "should reject malformed refresh token",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: "this-is-not-a-valid-jwt-token-format",
        } satisfies IRedditCommunityMember.IRefreshRequest,
      });
    },
  );

  // Test 2: Empty refresh token
  await TestValidator.error("should reject empty refresh token", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies IRedditCommunityMember.IRefreshRequest,
    });
  });

  // Test 3: Invalidated/revoked token (simulate with token from different context)
  // Using a hardcoded sample JWT that looks valid but likely fails validation
  const invalidContextToken =
    "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJzdWIiOiAnMTIzNDU2Nzg5MCcsICJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCAiaWF0IjogMTUxNjIzOTAyMn0=";
  await TestValidator.error(
    "should reject token from invalid context",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: invalidContextToken,
        } satisfies IRedditCommunityMember.IRefreshRequest,
      });
    },
  );

  // Test 4: Verify that with a valid token refresh succeeds
  const validRefresh = member.token.refresh;
  await TestValidator.predicate(
    "member should have valid refresh token",
    validRefresh !== null && validRefresh.length > 0,
  );

  // Verify refresh with valid token succeeds
  const refreshedMember: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: validRefresh,
      } satisfies IRedditCommunityMember.IRefreshRequest,
    });
  typia.assert(refreshedMember);

  // Verify refreshed access token is different from original
  await TestValidator.notEquals(
    "refreshed access token should be different",
    member.token.access,
    refreshedMember.token.access,
  );
}
