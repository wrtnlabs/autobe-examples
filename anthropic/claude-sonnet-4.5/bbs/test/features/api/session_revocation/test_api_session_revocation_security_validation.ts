import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSession";

/**
 * Test that users cannot revoke sessions belonging to other users, validating
 * the security constraints of the session revocation feature.
 *
 * This test ensures proper authorization enforcement by:
 *
 * 1. Creating two separate member accounts (User A and User B)
 * 2. Having both users log in to create active sessions
 * 3. User B attempting to retrieve User A's session information
 * 4. User B attempting to revoke User A's session (should fail)
 * 5. Verifying User A's session remains active after the unauthorized revocation
 *    attempt
 *
 * Business logic validation:
 *
 * - Users can only revoke their own sessions (ownership enforcement)
 * - Attempting to revoke another user's session returns proper authorization
 *   error
 * - Failed revocation attempts do not affect the target session
 * - Security validation prevents cross-user session manipulation
 */
export async function test_api_session_revocation_security_validation(
  connection: api.IConnection,
) {
  // Step 1: Create User A account
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = "SecurePass123!@#";

  const userARegistration = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(15),
      email: userAEmail,
      password: userAPassword,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(userARegistration);

  const userAId = userARegistration.id;

  // Step 2: User A logs in to create an active session
  const userALogin = await api.functional.auth.member.login(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(userALogin);

  // Step 3: Create User B account
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = "AnotherPass456!@#";

  const userBRegistration = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(15),
      email: userBEmail,
      password: userBPassword,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(userBRegistration);

  const userBId = userBRegistration.id;

  // Step 4: User B logs in to create their own session
  const userBLogin = await api.functional.auth.member.login(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(userBLogin);

  // Step 5: Switch to User A's session and retrieve session list to get sessionId
  await api.functional.auth.member.login(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const userASessionsPage =
    await api.functional.discussionBoard.member.users.sessions.index(
      connection,
      {
        userId: userAId,
        body: {
          is_active: true,
        } satisfies IDiscussionBoardSession.IRequest,
      },
    );
  typia.assert(userASessionsPage);

  TestValidator.predicate(
    "User A should have at least one active session",
    userASessionsPage.data.length > 0,
  );

  const userASessionId = userASessionsPage.data[0].id;

  // Step 6: Switch to User B's session
  await api.functional.auth.member.login(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 7: User B attempts to revoke User A's session (should fail)
  await TestValidator.error(
    "User B cannot revoke User A's session - authorization error expected",
    async () => {
      await api.functional.discussionBoard.member.users.sessions.erase(
        connection,
        {
          userId: userAId,
          sessionId: userASessionId,
        },
      );
    },
  );

  // Step 8: Switch back to User A and verify session is still active
  await api.functional.auth.member.login(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const verifySessionsPage =
    await api.functional.discussionBoard.member.users.sessions.index(
      connection,
      {
        userId: userAId,
        body: {
          is_active: true,
        } satisfies IDiscussionBoardSession.IRequest,
      },
    );
  typia.assert(verifySessionsPage);

  const sessionStillExists = verifySessionsPage.data.find(
    (session) => session.id === userASessionId,
  );

  typia.assertGuard(sessionStillExists!);

  TestValidator.equals(
    "User A's session should still be active",
    sessionStillExists.is_active,
    true,
  );

  TestValidator.equals(
    "User A's session ID should remain unchanged",
    sessionStillExists.id,
    userASessionId,
  );
}
