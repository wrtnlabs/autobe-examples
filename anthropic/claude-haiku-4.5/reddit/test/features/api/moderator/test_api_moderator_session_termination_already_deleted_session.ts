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
 * Test termination of a session that has already been deleted.
 *
 * Validates that deleting an already-deleted moderator session fails gracefully
 * with a 404 error. Tests the following workflow:
 *
 * 1. Create a moderator account with registration credentials
 * 2. Retrieve all active sessions for the moderator
 * 3. Delete a specific session successfully
 * 4. Attempt to delete the same session again
 * 5. Verify that the second deletion fails with 404 Not Found error
 * 6. Confirm error handling is proper for already-deleted sessions
 */
export async function test_api_moderator_session_termination_already_deleted_session(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Retrieve all active sessions for the moderator
  const sessionsPage: IPageICommunityPlatformModeratorSession =
    await api.functional.communityPlatform.moderator.auth.moderator.sessions.index(
      connection,
    );
  typia.assert(sessionsPage);

  // Verify that we have at least one session (the one created during login)
  TestValidator.predicate(
    "moderator should have at least one active session",
    sessionsPage.data.length > 0,
  );

  // Get the first session to delete
  const sessionToDelete: ICommunityPlatformModeratorSession =
    sessionsPage.data[0];
  const sessionIdToDelete = sessionToDelete.id;
  typia.assert(sessionIdToDelete);

  // Step 3: Delete the session successfully
  await api.functional.communityPlatform.moderator.auth.moderator.sessions.erase(
    connection,
    {
      sessionId: sessionIdToDelete,
    },
  );

  // Verify the session was deleted by attempting to retrieve sessions again
  const sessionsAfterDelete: IPageICommunityPlatformModeratorSession =
    await api.functional.communityPlatform.moderator.auth.moderator.sessions.index(
      connection,
    );
  typia.assert(sessionsAfterDelete);

  // Confirm that the deleted session is no longer in the list
  const deletedSessionStillExists = sessionsAfterDelete.data.some(
    (session) => session.id === sessionIdToDelete,
  );
  TestValidator.predicate(
    "deleted session should not appear in active sessions list",
    !deletedSessionStillExists,
  );

  // Step 4: Attempt to delete the already-deleted session again
  // This should fail with a 404 Not Found error
  await TestValidator.httpError(
    "deleting already-deleted session should fail with 404 Not Found",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.sessions.erase(
        connection,
        {
          sessionId: sessionIdToDelete,
        },
      );
    },
  );

  // Test passed: Error handling for already-deleted sessions is correct
  TestValidator.predicate(
    "idempotency edge case handled correctly - second deletion fails appropriately",
    true,
  );
}
