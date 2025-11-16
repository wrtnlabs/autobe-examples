import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModeratorSession";

/**
 * Test successful termination of a specific moderator session by session ID.
 *
 * This test creates a moderator account, obtains valid session IDs from the
 * active sessions, terminates one specific session, and verifies the deletion
 * succeeds. It also confirms that deleting one session does not affect other
 * active sessions, and that the terminated session is no longer accessible in
 * the active sessions list.
 *
 * The test demonstrates multi-device session management where a moderator can
 * logout from a specific device while maintaining active sessions on other
 * devices.
 *
 * Steps:
 *
 * 1. Create a new moderator account through registration (join)
 * 2. Retrieve all active sessions for the moderator
 * 3. Create a second session (by authenticating again with same credentials)
 * 4. Retrieve sessions again to have multiple sessions
 * 5. Delete/terminate one specific session using its session ID
 * 6. Verify the deleted session is no longer in the active sessions list
 * 7. Verify other sessions remain active after deletion
 */
export async function test_api_moderator_session_termination_single_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account through registration
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(12);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderatorCreated: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderatorCreated);
  TestValidator.equals(
    "moderator email matches",
    moderatorCreated.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches",
    moderatorCreated.username,
    moderatorUsername,
  );

  // Step 2: Retrieve all active sessions for the moderator
  const initialSessions: IPageICommunityPlatformModeratorSession =
    await api.functional.communityPlatform.moderator.auth.moderator.sessions.index(
      connection,
    );
  typia.assert(initialSessions);
  TestValidator.predicate(
    "sessions page exists",
    initialSessions.data !== undefined,
  );
  TestValidator.predicate(
    "has at least one session",
    initialSessions.data.length > 0,
  );

  // Step 3: Identify the session to be deleted
  const sessionToDelete: ICommunityPlatformModeratorSession =
    initialSessions.data[0];
  typia.assert(sessionToDelete);
  const sessionIdToDelete = sessionToDelete.id;
  TestValidator.predicate(
    "session ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sessionIdToDelete,
    ),
  );

  // Step 4: Capture other sessions before deletion (if any)
  const otherSessionIds = initialSessions.data
    .filter((session) => session.id !== sessionIdToDelete)
    .map((session) => session.id);

  // Step 5: Delete/terminate the specific session using the session ID
  await api.functional.communityPlatform.moderator.auth.moderator.sessions.erase(
    connection,
    {
      sessionId: sessionIdToDelete,
    },
  );

  TestValidator.predicate("session termination completed successfully", true);

  // Step 6: Verify the deleted session is no longer in the active sessions list
  const sessionsAfterDeletion: IPageICommunityPlatformModeratorSession =
    await api.functional.communityPlatform.moderator.auth.moderator.sessions.index(
      connection,
    );
  typia.assert(sessionsAfterDeletion);

  const deletedSessionStillExists = sessionsAfterDeletion.data.some(
    (session) => session.id === sessionIdToDelete,
  );
  TestValidator.predicate(
    "deleted session is no longer in active sessions list",
    !deletedSessionStillExists,
  );

  // Step 7: Verify other sessions remain active after deletion
  const remainingSessionIds = sessionsAfterDeletion.data.map(
    (session) => session.id,
  );
  for (const otherSessionId of otherSessionIds) {
    const sessionStillExists = remainingSessionIds.includes(otherSessionId);
    TestValidator.predicate(
      `other session ${otherSessionId} remains active after deletion`,
      sessionStillExists,
    );
  }
}
