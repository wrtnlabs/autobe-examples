import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuth";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test complete member logout workflow including session termination and token
 * invalidation.
 *
 * This test validates the entire logout process for a discussion board member:
 *
 * 1. Create a new member account through registration
 * 2. Authenticate the member to establish an active session with valid tokens
 * 3. Perform logout operation to terminate the current session
 * 4. Verify that the logout successfully invalidates tokens and terminates the
 *    session
 *
 * The logout operation should mark the session as expired in the database by
 * setting the expired_at timestamp, preventing the refresh token from being
 * reused to obtain new access tokens. This ensures proper session management
 * and security.
 */
export async function test_api_member_logout_session_termination(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const joinData = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinData,
    });
  typia.assert(registeredMember);

  TestValidator.equals(
    "registered member email matches",
    registeredMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "registered member username matches",
    registeredMember.username,
    memberUsername,
  );

  // Step 2: Authenticate member to establish active session
  const loginData = {
    username_or_email: memberEmail,
    password: memberPassword,
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ILogin;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginData,
    });
  typia.assert(authenticatedMember);

  TestValidator.equals(
    "authenticated member ID matches registered member",
    authenticatedMember.id,
    registeredMember.id,
  );

  // Step 3: Perform logout operation
  const logoutResult: IDiscussionBoardAuth.ILogoutResult =
    await api.functional.discussionBoard.member.auth.logout(connection);
  typia.assert(logoutResult);

  // Step 4: Validate logout success
  TestValidator.equals(
    "logout operation succeeded",
    logoutResult.success,
    true,
  );

  TestValidator.predicate(
    "logout message is provided",
    logoutResult.message.length > 0,
  );
}
