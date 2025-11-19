import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful JWT token refresh flow for authenticated members.
 *
 * This test validates the complete token refresh workflow:
 *
 * 1. Creates a new member account via join endpoint
 * 2. Obtains initial authentication tokens (30-minute access token, 7-day refresh
 *    token)
 * 3. Uses the refresh token to obtain new JWT tokens
 * 4. Verifies that refresh operation returns renewed tokens with updated
 *    expiration times
 * 5. Confirms that member profile information is included in the refresh response
 * 6. Validates that the session remains active with the new access token
 *
 * The refresh operation is critical for maintaining long-lived authenticated
 * sessions across the 30-minute access token expiration boundary without
 * requiring credential re-entry.
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to obtain initial tokens
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();

  const joinBody = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const initialAuth = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(initialAuth);

  // Validate initial authentication response structure
  TestValidator.predicate(
    "initial auth should have valid token structure",
    initialAuth.token !== null && initialAuth.token !== undefined,
  );
  TestValidator.predicate(
    "initial auth should have refresh token",
    initialAuth.token.refresh.length > 0,
  );

  // Store initial token expiration times for comparison
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;

  // Step 2: Use the refresh token to obtain new JWT tokens
  const refreshBody = {
    refresh_token: initialAuth.token.refresh,
  } satisfies IDiscussionBoardMember.IRefresh;

  const refreshedAuth = await api.functional.auth.member.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshedAuth);

  // Step 3: Validate refreshed authentication response
  TestValidator.predicate(
    "refreshed auth should have valid token structure",
    refreshedAuth.token !== null && refreshedAuth.token !== undefined,
  );

  // Validate new tokens are different from initial tokens
  TestValidator.notEquals(
    "new access token should differ from initial",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "new refresh token should differ from initial",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );

  // Validate token expiration times are updated
  TestValidator.predicate(
    "new access token expiration should be updated",
    refreshedAuth.token.expired_at !== initialExpiredAt,
  );
  TestValidator.predicate(
    "new refresh token expiration should be updated",
    refreshedAuth.token.refreshable_until !== initialRefreshableUntil,
  );

  // Step 4: Validate complete member profile is included in refresh response
  TestValidator.equals(
    "member id should match",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "member email should match",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "member username should match",
    refreshedAuth.username,
    initialAuth.username,
  );
  TestValidator.equals(
    "member display_name should match",
    refreshedAuth.display_name,
    initialAuth.display_name,
  );
  TestValidator.equals(
    "member bio should match",
    refreshedAuth.bio,
    initialAuth.bio,
  );
  TestValidator.equals(
    "email verification status should match",
    refreshedAuth.email_verified,
    initialAuth.email_verified,
  );
  TestValidator.equals(
    "suspension status should match",
    refreshedAuth.is_suspended,
    initialAuth.is_suspended,
  );

  // Step 5: Validate session remains active with new access token
  // The connection.headers.Authorization should be automatically updated by the SDK
  TestValidator.predicate(
    "new access token should be set in connection headers",
    connection.headers !== null &&
      connection.headers !== undefined &&
      connection.headers.Authorization === refreshedAuth.token.access,
  );
}
