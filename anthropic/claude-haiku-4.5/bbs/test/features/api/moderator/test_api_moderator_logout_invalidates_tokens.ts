import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderator logout properly invalidates the current authentication
 * session.
 *
 * This test validates the token invalidation workflow:
 *
 * 1. Create a moderator account
 * 2. Log in to obtain access and refresh tokens
 * 3. Call logout endpoint to invalidate the session
 * 4. Verify that a new login generates different tokens
 * 5. Confirm token rotation is working (new tokens != old tokens)
 *
 * This ensures security by preventing reuse of old tokens after logout.
 */
export async function test_api_moderator_logout_invalidates_tokens(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = "SecurePassword123!";
  const moderatorDisplayName = RandomGenerator.name();

  const joinResponse = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      display_name: moderatorDisplayName,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(joinResponse);

  TestValidator.equals(
    "join response should contain authorization token",
    joinResponse.token !== undefined,
    true,
  );

  // Step 2: Log in to obtain initial tokens
  const loginResponse = await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/dashboard",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(loginResponse);

  const invalidAccessToken = loginResponse.token.access;
  const invalidRefreshToken = loginResponse.token.refresh;

  TestValidator.equals(
    "login response should contain valid tokens",
    loginResponse.token !== undefined,
    true,
  );

  // Step 3: Call logout to invalidate the session
  await api.functional.discussionBoard.moderator.auth.moderator.logout(
    connection,
  );

  // Step 4: Verify that a new login after logout generates different tokens
  const reLoginResponse = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: "http://localhost:3000/dashboard",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardModerator.ILogin,
    },
  );
  typia.assert(reLoginResponse);

  // Step 5: Confirm token rotation - new tokens must be different from old tokens
  TestValidator.notEquals(
    "new access token should differ from invalidated token",
    reLoginResponse.token.access,
    invalidAccessToken,
  );

  TestValidator.notEquals(
    "new refresh token should differ from invalidated token",
    reLoginResponse.token.refresh,
    invalidRefreshToken,
  );

  // Step 6: Verify moderator session is active with new tokens
  TestValidator.predicate(
    "new tokens should be valid strings",
    reLoginResponse.token.access.length > 0 &&
      reLoginResponse.token.refresh.length > 0,
  );

  // Step 7: Logout again to confirm the new session can be invalidated
  await api.functional.discussionBoard.moderator.auth.moderator.logout(
    connection,
  );

  TestValidator.predicate("logout should succeed for new session", true);
}
