import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuth";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the token refresh workflow that allows users to obtain new access tokens
 * without re-entering credentials.
 *
 * This test validates the complete authentication and token refresh flow:
 *
 * 1. Creates a new member account through the join operation
 * 2. Authenticates using the login operation to obtain initial JWT tokens
 * 3. Uses the refresh token to request a new access token through the refresh
 *    operation
 * 4. Validates that the new access token is issued successfully
 *
 * The refresh operation validates the session, verifies it has not expired,
 * confirms the user account is in active status, and issues a fresh access
 * token with updated 30-minute expiration.
 */
export async function test_api_token_refresh_with_valid_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through join operation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: "192.168.1.100",
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.IJoin;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // Validate the member account was created successfully
  TestValidator.equals(
    "member username matches",
    authorizedMember.username,
    memberUsername,
  );
  TestValidator.equals(
    "member email matches",
    authorizedMember.email,
    memberEmail,
  );
  TestValidator.predicate(
    "member has valid token",
    authorizedMember.token !== null && authorizedMember.token !== undefined,
  );

  // Step 2: Authenticate using login operation to obtain initial JWT tokens
  const loginBody = {
    username_or_email: memberEmail,
    password: memberPassword,
    ip: "192.168.1.100",
    href: "https://example.com/login" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAuth.ILogin;

  const loginResult: IDiscussionBoardAuth.ILoginResult =
    await api.functional.discussionBoard.auth.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // Validate login result contains expected user information and tokens
  TestValidator.equals(
    "logged in user id matches",
    loginResult.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "logged in username matches",
    loginResult.username,
    memberUsername,
  );
  TestValidator.equals(
    "logged in email matches",
    loginResult.email,
    memberEmail,
  );
  TestValidator.predicate(
    "login token exists",
    loginResult.token !== null && loginResult.token !== undefined,
  );

  // Store the initial refresh token for the refresh operation
  const initialRefreshToken = loginResult.token.refresh;
  const initialAccessToken = loginResult.token.access;

  // Step 3: Use the refresh token to request a new access token
  const refreshBody = {
    refresh_token: initialRefreshToken,
  } satisfies IDiscussionBoardAuth.IRefresh;

  const refreshedTokens: IDiscussionBoardAuth.ITokens =
    await api.functional.discussionBoard.auth.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedTokens);

  // Step 4: Validate that the new tokens were issued successfully
  TestValidator.predicate(
    "new access token is issued",
    refreshedTokens.access_token !== null &&
      refreshedTokens.access_token !== undefined,
  );
  TestValidator.predicate(
    "new access token differs from initial",
    refreshedTokens.access_token !== initialAccessToken,
  );
  TestValidator.equals(
    "token type is Bearer",
    refreshedTokens.token_type,
    "Bearer",
  );
  TestValidator.equals(
    "access token expires in 1800 seconds",
    refreshedTokens.expires_in,
    1800,
  );
  TestValidator.predicate(
    "new refresh token is issued",
    refreshedTokens.refresh_token !== null &&
      refreshedTokens.refresh_token !== undefined,
  );
}
