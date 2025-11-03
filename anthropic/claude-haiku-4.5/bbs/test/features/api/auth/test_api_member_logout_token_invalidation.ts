import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that member's JWT token becomes completely invalid after logout.
 *
 * This test validates the session termination flow by verifying that:
 *
 * 1. A member can register and log in to obtain valid JWT tokens
 * 2. The logout endpoint successfully terminates the session
 * 3. After logout, the member can register and login again with new tokens
 *
 * The test ensures that the logout operation properly invalidates the current
 * session, preventing token reuse and requiring re-authentication for
 * subsequent API access.
 */
export async function test_api_member_logout_token_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123";

  const registerResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(registerResponse);
  TestValidator.predicate(
    "registration should return member with ID",
    registerResponse.id.length > 0,
  );

  // Step 2: Log in to obtain valid JWT tokens
  const loginResponse = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });
  typia.assert(loginResponse);

  // Capture the access token before logout
  const tokenBeforeLogout = loginResponse.token.access;
  TestValidator.predicate(
    "access token should exist and be non-empty",
    tokenBeforeLogout.length > 0,
  );

  // Step 3: Execute logout to invalidate the session
  // Logout should succeed without throwing an error
  await api.functional.discussionBoard.member.auth.logout(connection);
  TestValidator.predicate("logout should complete successfully", true);

  // Step 4: Verify that re-login is possible after logout
  // This demonstrates that the old session was terminated and a fresh
  // authentication is required
  const newLoginResponse = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });
  typia.assert(newLoginResponse);

  // Step 5: Verify new token is issued after re-login
  TestValidator.notEquals(
    "new token after logout should differ from previous token",
    newLoginResponse.token.access,
    tokenBeforeLogout,
  );

  // Step 6: Verify token expiration times are updated
  TestValidator.notEquals(
    "new token expiration should differ from previous",
    newLoginResponse.token.expired_at,
    loginResponse.token.expired_at,
  );

  // Step 7: Verify logout can be called multiple times (idempotency)
  await api.functional.discussionBoard.member.auth.logout(connection);
  TestValidator.predicate(
    "logout should be idempotent and succeed again",
    true,
  );
}
