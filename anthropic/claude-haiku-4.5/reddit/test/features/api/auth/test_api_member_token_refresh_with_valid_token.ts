import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful member token refresh when a valid refresh token is provided.
 *
 * The scenario validates the core token renewal workflow where a member with an
 * active session uses their refresh token to obtain a new access token. This
 * test verifies that the endpoint correctly validates the refresh token against
 * the active session in the database, issues a new access token with updated
 * expiration timestamps, and returns both access and refresh token
 * information.
 *
 * The response should include the new access token, refresh token, and
 * expiration metadata (expired_at and refreshable_until timestamps). This
 * represents the primary success path for maintaining long-lived authenticated
 * sessions.
 *
 * Workflow:
 *
 * 1. Create a new member account to establish initial authentication tokens
 * 2. Extract the refresh token from the join response
 * 3. Call token refresh with the valid refresh token
 * 4. Validate the new tokens are issued with correct format and expiration data
 */
export async function test_api_member_token_refresh_with_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to establish initial session
  const securePassword =
    RandomGenerator.alphabets(3).toUpperCase() +
    RandomGenerator.alphabets(3) +
    RandomGenerator.alphaNumeric(2) +
    "!@#"[Math.floor(Math.random() * 3)];

  const joinResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>().toLowerCase(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: securePassword,
        ip: "192.168.1.1",
        href: typia
          .random<string & tags.Format<"uri">>()
          .replace(/^https?:/, "https:"),
        referrer: typia
          .random<string & tags.Format<"uri">>()
          .replace(/^https?:/, "https:"),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(joinResponse);

  // Validate initial tokens are present
  TestValidator.predicate(
    "initial access token should be present",
    joinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token should be present",
    joinResponse.token.refresh.length > 0,
  );

  // Validate initial expiration timestamps are properly formatted
  typia.assert<string & tags.Format<"date-time">>(
    joinResponse.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    joinResponse.token.refreshable_until,
  );

  // Step 2: Call refresh endpoint with valid refresh token
  const refreshResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: joinResponse.token.refresh,
      } satisfies ICommunityPlatformMember.IRefresh,
    });
  typia.assert(refreshResponse);

  // Step 3: Validate refresh response structure
  TestValidator.predicate(
    "refreshed access token should be present",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should be present",
    refreshResponse.token.refresh.length > 0,
  );

  // Step 4: Validate token expiration timestamps are properly formatted
  typia.assert<string & tags.Format<"date-time">>(
    refreshResponse.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    refreshResponse.token.refreshable_until,
  );

  // Step 5: Verify new tokens are different from original tokens
  TestValidator.notEquals(
    "new access token should differ from original",
    joinResponse.token.access,
    refreshResponse.token.access,
  );

  // Step 6: Verify token metadata is reasonable
  const expiredAtTime = new Date(refreshResponse.token.expired_at).getTime();
  const refreshableUntilTime = new Date(
    refreshResponse.token.refreshable_until,
  ).getTime();
  const nowTime = new Date().getTime();

  TestValidator.predicate(
    "expired_at should be in the future",
    expiredAtTime > nowTime,
  );
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshableUntilTime > expiredAtTime,
  );
}
