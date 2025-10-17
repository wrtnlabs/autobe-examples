import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test successful member access token refresh using a valid refresh token.
 *
 * This test validates the token refresh mechanism that allows members to obtain
 * new access tokens without re-entering credentials. The workflow tests the
 * complete refresh cycle:
 *
 * 1. Create a new member account through registration
 * 2. Extract the initial refresh token from registration response
 * 3. Use the refresh token to request a new access token
 * 4. Validate the new access token is generated with fresh expiration
 * 5. Verify the refresh token remains valid with original expiration
 * 6. Confirm updated user profile information is returned
 * 7. Ensure session activity timestamp is updated
 *
 * The test verifies that the refresh mechanism maintains proper token
 * lifecycle, security, and user session state according to the 30-minute access
 * token and 30-day refresh token expiration requirements.
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to obtain initial tokens
  const registrationData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const initialMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(initialMember);

  // Step 2: Store the initial token information for comparison
  const initialAccessToken = initialMember.token.access;
  const initialRefreshToken = initialMember.token.refresh;
  const initialAccessExpiration = initialMember.token.expired_at;
  const initialRefreshExpiration = initialMember.token.refreshable_until;

  // Step 3: Use the refresh token to obtain a new access token
  const refreshedMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IRedditLikeMember.IRefresh,
    });

  typia.assert(refreshedMember);

  // Step 4: Validate the refresh response structure and data
  TestValidator.equals(
    "member ID should remain the same",
    refreshedMember.id,
    initialMember.id,
  );

  TestValidator.equals(
    "username should remain the same",
    refreshedMember.username,
    initialMember.username,
  );

  TestValidator.equals(
    "email should remain the same",
    refreshedMember.email,
    initialMember.email,
  );

  // Step 5: Verify new access token was generated
  TestValidator.notEquals(
    "new access token should be different from initial",
    refreshedMember.token.access,
    initialAccessToken,
  );

  // Step 6: Verify refresh token remains unchanged
  TestValidator.equals(
    "refresh token should remain the same",
    refreshedMember.token.refresh,
    initialRefreshToken,
  );

  // Step 7: Validate token expiration times are in the future
  TestValidator.predicate(
    "new access token expiration should be in the future",
    new Date(refreshedMember.token.expired_at).getTime() > Date.now(),
  );

  TestValidator.predicate(
    "refresh token expiration should be in the future",
    new Date(refreshedMember.token.refreshable_until).getTime() > Date.now(),
  );

  // Step 8: Verify member profile data is current with initial karma values
  TestValidator.equals(
    "post karma should be initialized to 0",
    refreshedMember.post_karma,
    0,
  );

  TestValidator.equals(
    "comment karma should be initialized to 0",
    refreshedMember.comment_karma,
    0,
  );

  TestValidator.equals(
    "email verified status should match",
    refreshedMember.email_verified,
    initialMember.email_verified,
  );
}
