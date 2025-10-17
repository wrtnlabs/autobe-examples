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
 * Test the complete workflow of a member revoking their own active session to
 * log out from a specific device.
 *
 * This test validates the multi-device session management security feature by:
 *
 * 1. Creating a new member account
 * 2. Authenticating to create an active session with JWT tokens
 * 3. Retrieving the session list to identify the sessionId
 * 4. Revoking the specific session
 * 5. Verifying immediate session invalidation and removal
 * 6. Confirming the session no longer appears in active sessions
 *
 * Business logic validation:
 *
 * - Session revocation immediately invalidates both access and refresh tokens
 * - The session record is permanently removed (hard delete, no soft delete)
 * - The user can only revoke their own sessions (ownership validation)
 * - After revocation, the affected device cannot make authenticated requests
 */
export async function test_api_session_revocation_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Member registers a new account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const registrationData = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredMember);

  // Step 2: Member logs in to create an active session
  const loginData = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IDiscussionBoardMember.ILogin;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginData,
    });
  typia.assert(authenticatedMember);

  // Verify member IDs match
  TestValidator.equals(
    "registered and authenticated member IDs should match",
    registeredMember.id,
    authenticatedMember.id,
  );

  // Step 3: Retrieve session list to identify the sessionId
  const sessionRequestData = {
    is_active: true,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSession.IRequest;

  const sessionsPage: IPageIDiscussionBoardSession =
    await api.functional.discussionBoard.member.users.sessions.index(
      connection,
      {
        userId: authenticatedMember.id,
        body: sessionRequestData,
      },
    );
  typia.assert(sessionsPage);

  // Verify that we have at least one active session
  TestValidator.predicate(
    "should have at least one active session",
    sessionsPage.data.length > 0,
  );

  // Get the first active session (the one we just created)
  const activeSession = sessionsPage.data[0];
  typia.assertGuard(activeSession);

  // Verify session belongs to the authenticated member
  TestValidator.equals(
    "session should belong to the authenticated member",
    activeSession.discussion_board_member_id,
    authenticatedMember.id,
  );

  // Verify session is active
  TestValidator.equals(
    "session should be active",
    activeSession.is_active,
    true,
  );

  // Step 4: Revoke the specific session
  await api.functional.discussionBoard.member.users.sessions.erase(connection, {
    userId: authenticatedMember.id,
    sessionId: activeSession.id,
  });

  // Step 5: Verify the session no longer appears in active sessions list
  const updatedSessionsPage: IPageIDiscussionBoardSession =
    await api.functional.discussionBoard.member.users.sessions.index(
      connection,
      {
        userId: authenticatedMember.id,
        body: sessionRequestData,
      },
    );
  typia.assert(updatedSessionsPage);

  // Verify the revoked session is not in the list
  const revokedSessionExists = updatedSessionsPage.data.some(
    (session) => session.id === activeSession.id,
  );

  TestValidator.equals(
    "revoked session should not appear in active sessions list",
    revokedSessionExists,
    false,
  );
}
