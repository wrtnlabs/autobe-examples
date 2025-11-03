import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuth";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test token refresh operation with proper session validation.
 *
 * This test validates that the token refresh endpoint correctly validates
 * session integrity before issuing new tokens. It verifies that only valid
 * active sessions belonging to active users can obtain new access tokens.
 *
 * Test flow:
 *
 * 1. Create a new member account
 * 2. Authenticate the member to create a session
 * 3. Use the refresh token to obtain new access tokens
 * 4. Validate the token response structure
 */
export async function test_api_token_refresh_session_validation(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Test1234!@#$";

  const joinData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: memberEmail,
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinData,
    });
  typia.assert(authorizedMember);

  // Step 2: Authenticate the member to create a session
  const loginData = {
    username_or_email: memberEmail,
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAuth.ILogin;

  const loginResult: IDiscussionBoardAuth.ILoginResult =
    await api.functional.discussionBoard.auth.login(connection, {
      body: loginData,
    });
  typia.assert(loginResult);

  // Verify login was successful and we have tokens
  TestValidator.predicate(
    "login should return valid tokens",
    loginResult.token.access.length > 0 && loginResult.token.refresh.length > 0,
  );

  // Step 3: Use the refresh token to obtain new access tokens
  const refreshData = {
    refresh_token: loginResult.token.refresh,
  } satisfies IDiscussionBoardAuth.IRefresh;

  const refreshedTokens: IDiscussionBoardAuth.ITokens =
    await api.functional.discussionBoard.auth.refresh(connection, {
      body: refreshData,
    });
  typia.assert(refreshedTokens);

  // Step 4: Validate the token response structure
  TestValidator.predicate(
    "refreshed access token should exist",
    refreshedTokens.access_token.length > 0,
  );

  TestValidator.predicate(
    "refreshed token type should be Bearer",
    refreshedTokens.token_type === "Bearer",
  );

  TestValidator.predicate(
    "expires_in should be positive",
    refreshedTokens.expires_in > 0,
  );

  TestValidator.predicate(
    "new refresh token should exist",
    refreshedTokens.refresh_token.length > 0,
  );

  // Verify the new access token is different from the original
  TestValidator.predicate(
    "new access token should differ from original",
    refreshedTokens.access_token !== loginResult.token.access,
  );
}
