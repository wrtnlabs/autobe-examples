import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that a single member can have multiple concurrent active sessions.
 *
 * This test validates the platform's ability to support multiple simultaneous
 * login sessions for the same user account from different devices or browsers.
 *
 * Test Flow:
 *
 * 1. Register a new member account
 * 2. Perform multiple login operations with different session contexts
 *    (href/referrer)
 * 3. Verify each login succeeds and returns unique session tokens
 * 4. Confirm member data consistency across all sessions
 */
export async function test_api_member_login_multiple_sessions(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";
  const memberUsername = RandomGenerator.name();

  const registrationData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: "https://discussionboard.example.com/register",
    referrer: "https://discussionboard.example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(registeredMember);

  // Verify registration successful
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

  // Step 2: Perform first login from web browser context
  const loginSession1Data = {
    email: memberEmail,
    password: memberPassword,
    href: "https://discussionboard.example.com/login",
    referrer: "https://discussionboard.example.com/articles",
  } satisfies IDiscussionBoardMember.ILogin;

  const session1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginSession1Data,
    });

  typia.assert(session1);

  // Step 3: Perform second login from mobile device context
  const loginSession2Data = {
    email: memberEmail,
    password: memberPassword,
    href: "https://m.discussionboard.example.com/login",
    referrer: "https://m.discussionboard.example.com/home",
  } satisfies IDiscussionBoardMember.ILogin;

  const session2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginSession2Data,
    });

  typia.assert(session2);

  // Step 4: Perform third login from another browser/location context
  const loginSession3Data = {
    email: memberEmail,
    password: memberPassword,
    href: "https://discussionboard.example.com/dashboard",
    referrer: "https://google.com/search",
  } satisfies IDiscussionBoardMember.ILogin;

  const session3: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginSession3Data,
    });

  typia.assert(session3);

  // Step 5: Verify all sessions belong to the same member
  TestValidator.equals(
    "session 1 member id matches registered member",
    session1.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "session 2 member id matches registered member",
    session2.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "session 3 member id matches registered member",
    session3.id,
    registeredMember.id,
  );

  // Verify member data consistency across sessions
  TestValidator.equals("session 1 email matches", session1.email, memberEmail);
  TestValidator.equals("session 2 email matches", session2.email, memberEmail);
  TestValidator.equals("session 3 email matches", session3.email, memberEmail);

  // Step 6: Verify each session has unique tokens
  TestValidator.notEquals(
    "session 1 and session 2 have different access tokens",
    session1.token.access,
    session2.token.access,
  );
  TestValidator.notEquals(
    "session 1 and session 3 have different access tokens",
    session1.token.access,
    session3.token.access,
  );
  TestValidator.notEquals(
    "session 2 and session 3 have different access tokens",
    session2.token.access,
    session3.token.access,
  );

  TestValidator.notEquals(
    "session 1 and session 2 have different refresh tokens",
    session1.token.refresh,
    session2.token.refresh,
  );
  TestValidator.notEquals(
    "session 1 and session 3 have different refresh tokens",
    session1.token.refresh,
    session3.token.refresh,
  );
  TestValidator.notEquals(
    "session 2 and session 3 have different refresh tokens",
    session2.token.refresh,
    session3.token.refresh,
  );
}
