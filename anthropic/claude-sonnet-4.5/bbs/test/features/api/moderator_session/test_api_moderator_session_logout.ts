import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";

/**
 * Test moderator logout by deleting an active session.
 *
 * This test validates the moderator session deletion (logout) workflow:
 *
 * 1. Register a new moderator account (establishes authenticated session)
 * 2. Attempt to delete a session using the logout endpoint
 *
 * Note: The join endpoint returns IDiscussionBoardModerator.IAuthorized which
 * does not expose the session ID. In a real-world scenario, the session ID
 * would need to be obtained through a session listing endpoint or from the
 * initial registration flow. For this test, we create a realistic session ID to
 * demonstrate the logout endpoint functionality.
 *
 * The test ensures that the logout endpoint correctly processes session
 * deletion requests for authenticated moderators.
 */
export async function test_api_moderator_session_logout(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.name(2),
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(registeredModerator);

  // Verify moderator was created successfully
  TestValidator.predicate(
    "moderator email matches registration",
    registeredModerator.email === moderatorEmail,
  );

  TestValidator.predicate(
    "moderator has valid ID",
    registeredModerator.id.length > 0,
  );

  TestValidator.predicate(
    "moderator has access token",
    registeredModerator.token.access.length > 0,
  );

  // Step 2: Extract moderator ID
  const moderatorId = registeredModerator.id;

  // Step 3: Generate a session ID for logout test
  // Note: In a real scenario, this would come from a session listing endpoint
  // or be returned by the join endpoint. Here we use a valid UUID format.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Delete the session (logout)
  const deletedSession: IDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.erase(
      connection,
      {
        moderatorId: moderatorId,
        sessionId: sessionId,
      },
    );

  typia.assert(deletedSession);

  // Step 5: Validate the deleted session response
  TestValidator.equals(
    "deleted session belongs to correct moderator",
    deletedSession.discussion_board_moderator_id,
    moderatorId,
  );

  TestValidator.equals(
    "deleted session ID matches request",
    deletedSession.id,
    sessionId,
  );

  // Step 6: Verify session expiration
  TestValidator.predicate(
    "deleted session has expired_at timestamp",
    deletedSession.expired_at !== null &&
      deletedSession.expired_at !== undefined,
  );

  // Step 7: Verify session metadata is present
  TestValidator.predicate(
    "deleted session has IP address",
    deletedSession.ip.length > 0,
  );

  TestValidator.predicate(
    "deleted session has href",
    deletedSession.href.length > 0,
  );

  TestValidator.predicate(
    "deleted session has moderator summary",
    deletedSession.moderator.id === moderatorId,
  );
}
