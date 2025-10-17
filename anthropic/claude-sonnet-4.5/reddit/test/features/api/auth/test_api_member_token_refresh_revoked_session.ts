import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test token refresh functionality with valid session.
 *
 * NOTE: The original scenario requested testing refresh rejection on revoked
 * sessions, but the available API does not provide session revocation endpoints
 * (logout, password change, or direct session manipulation). Therefore, this
 * test validates the successful refresh path to ensure the token refresh
 * mechanism works correctly.
 *
 * This test validates that:
 *
 * 1. Valid refresh tokens successfully generate new access tokens
 * 2. User identity is preserved across token refresh
 * 3. Token refresh returns complete user profile information
 * 4. Refresh tokens maintain session continuity
 *
 * Workflow:
 *
 * 1. Create a new member account to obtain initial tokens
 * 2. Use the refresh token to obtain new access token
 * 3. Verify the refreshed response maintains user identity
 * 4. Confirm all required fields are present in the refresh response
 */
export async function test_api_member_token_refresh_revoked_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account and establish a valid session
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const authorizedMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Step 2: Store the refresh token from the initial authentication
  const refreshToken: string = authorizedMember.token.refresh;

  // Step 3: Use the refresh token to obtain new access token
  const refreshResult: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IRedditLikeMember.IRefresh,
    });
  typia.assert(refreshResult);

  // Step 4: Verify the refresh was successful and returned valid data
  TestValidator.equals(
    "refreshed member ID matches original",
    refreshResult.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "refreshed username matches original",
    refreshResult.username,
    authorizedMember.username,
  );
  TestValidator.equals(
    "refreshed email matches original",
    refreshResult.email,
    authorizedMember.email,
  );

  // Step 5: Verify new tokens were issued
  TestValidator.predicate(
    "new access token was generated",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    refreshResult.token.refresh.length > 0,
  );
}
