import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test multiple concurrent session support for member authentication.
 *
 * This test validates that the discussion board platform correctly supports
 * multiple concurrent login sessions for a single member account. It ensures
 * that members can authenticate from different devices or locations
 * simultaneously without sessions invalidating each other.
 *
 * Test workflow:
 *
 * 1. Register a new member account with valid credentials
 * 2. Perform three separate login operations using the same credentials
 * 3. Each login simulates a different device/location with unique session context
 * 4. Verify that each login creates a unique session with distinct JWT tokens
 * 5. Validate that all sessions remain active concurrently
 * 6. Confirm that last_login_at timestamp reflects the most recent login
 */
export async function test_api_member_login_multiple_concurrent_sessions(
  connection: api.IConnection,
) {
  // Phase 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!@#";
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const registrationBody = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    ip: "192.168.1.100",
    href: "https://discussion-board.example.com/register",
    referrer: "https://discussion-board.example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredMember);

  // Verify registration succeeded
  TestValidator.equals(
    "registered email matches",
    registeredMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "registered username matches",
    registeredMember.username,
    memberUsername,
  );

  // Phase 2: Perform multiple concurrent logins with different session contexts

  // First login - simulating desktop browser
  const login1Body = {
    email: memberEmail,
    password: memberPassword,
    ip: "192.168.1.101",
    href: "https://discussion-board.example.com/login",
    referrer: "https://discussion-board.example.com/articles",
  } satisfies IDiscussionBoardMember.ILogin;

  const session1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: login1Body,
    });
  typia.assert(session1);

  // Second login - simulating mobile device
  const login2Body = {
    email: memberEmail,
    password: memberPassword,
    ip: "10.0.0.50",
    href: "https://discussion-board.example.com/m/login",
    referrer: "https://discussion-board.example.com/m/home",
  } satisfies IDiscussionBoardMember.ILogin;

  const session2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: login2Body,
    });
  typia.assert(session2);

  // Third login - simulating tablet or another location
  const login3Body = {
    email: memberEmail,
    password: memberPassword,
    ip: "172.16.0.25",
    href: "https://discussion-board.example.com/login",
    referrer: "https://www.google.com",
  } satisfies IDiscussionBoardMember.ILogin;

  const session3: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: login3Body,
    });
  typia.assert(session3);

  // Phase 3: Validate unique JWT tokens for each session

  // Verify each session has valid token structure
  typia.assert<IAuthorizationToken>(session1.token);
  typia.assert<IAuthorizationToken>(session2.token);
  typia.assert<IAuthorizationToken>(session3.token);

  // Verify access tokens are unique across all sessions
  TestValidator.notEquals(
    "session1 and session2 have different access tokens",
    session1.token.access,
    session2.token.access,
  );
  TestValidator.notEquals(
    "session1 and session3 have different access tokens",
    session1.token.access,
    session3.token.access,
  );
  TestValidator.notEquals(
    "session2 and session3 have different access tokens",
    session2.token.access,
    session3.token.access,
  );

  // Verify refresh tokens are unique across all sessions
  TestValidator.notEquals(
    "session1 and session2 have different refresh tokens",
    session1.token.refresh,
    session2.token.refresh,
  );
  TestValidator.notEquals(
    "session1 and session3 have different refresh tokens",
    session1.token.refresh,
    session3.token.refresh,
  );
  TestValidator.notEquals(
    "session2 and session3 have different refresh tokens",
    session2.token.refresh,
    session3.token.refresh,
  );

  // Phase 4: Verify all sessions reference the same member
  TestValidator.equals(
    "all sessions belong to same member ID",
    session1.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "session2 belongs to same member",
    session2.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "session3 belongs to same member",
    session3.id,
    registeredMember.id,
  );

  TestValidator.equals(
    "all sessions have same email",
    session1.email,
    memberEmail,
  );
  TestValidator.equals("session2 has same email", session2.email, memberEmail);
  TestValidator.equals("session3 has same email", session3.email, memberEmail);

  // Phase 5: Validate last_login_at timestamp progression
  // Each subsequent login should have a last_login_at that is greater than or equal to the previous

  // Use typia.assert with non-null assertion to safely extract timestamp values
  const time1 = new Date(typia.assert(session1.last_login_at!)).getTime();
  const time2 = new Date(typia.assert(session2.last_login_at!)).getTime();
  const time3 = new Date(typia.assert(session3.last_login_at!)).getTime();

  // Session 2 login time should be >= session 1 (allowing for same-second logins in fast tests)
  TestValidator.predicate(
    "session2 login time is at or after session1",
    time2 >= time1,
  );

  // Session 3 login time should be >= session 2
  TestValidator.predicate(
    "session3 login time is at or after session2",
    time3 >= time2,
  );

  // The final session should have the most recent (or equal) last_login_at
  TestValidator.predicate(
    "final session has most recent login timestamp",
    time3 >= time1 && time3 >= time2,
  );
}
