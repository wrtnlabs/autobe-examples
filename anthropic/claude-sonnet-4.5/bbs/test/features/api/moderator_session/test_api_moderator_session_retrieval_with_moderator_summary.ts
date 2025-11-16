import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";

/**
 * Test that session retrieval includes embedded moderator summary information
 * for contextual display.
 *
 * This scenario validates that when retrieving a session, the response includes
 * a complete moderator summary object with essential moderator details (id,
 * email, username, timestamps) embedded within the session entity. The test
 * verifies that the embedded moderator information matches the authenticated
 * moderator's profile, that all required moderator summary fields are present,
 * and that this enables displaying session information with moderator context
 * in a single API call without requiring separate moderator lookups.
 *
 * Steps:
 *
 * 1. Create moderator account to establish authentication context
 * 2. Retrieve a session using moderator ID and a session ID
 * 3. Validate session response structure includes embedded moderator summary
 * 4. Verify moderator summary data matches expected moderator profile
 * 5. Confirm all required moderator summary fields are present and valid
 *
 * Note: This test demonstrates the API contract for session retrieval with
 * embedded moderator summary, even though obtaining a valid session ID from the
 * current API operations is not directly supported in the provided endpoints.
 */
export async function test_api_moderator_session_retrieval_with_moderator_summary(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const moderatorUsername = RandomGenerator.name(1);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Extract moderator ID for session retrieval
  const moderatorId = moderator.id;

  // Step 3: Generate a session ID for retrieval demonstration
  // Note: In a real scenario, this would come from a session listing or authentication flow
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Retrieve the session with embedded moderator summary
  const session =
    await api.functional.discussionBoard.moderator.moderators.sessions.at(
      connection,
      {
        moderatorId: moderatorId,
        sessionId: sessionId,
      },
    );
  typia.assert(session);

  // Step 5: Verify embedded moderator summary matches authenticated moderator
  const moderatorSummary = session.moderator;

  TestValidator.equals(
    "moderator summary ID matches authenticated moderator",
    moderatorSummary.id,
    moderatorId,
  );

  TestValidator.equals(
    "moderator summary email matches authenticated moderator",
    moderatorSummary.email,
    moderatorEmail,
  );

  TestValidator.equals(
    "moderator summary username matches authenticated moderator",
    moderatorSummary.username,
    moderatorUsername,
  );

  // Step 6: Verify session references correct moderator
  TestValidator.equals(
    "session moderator reference matches moderator ID",
    session.discussion_board_moderator_id,
    moderatorId,
  );

  // Step 7: Verify session ID matches requested session
  TestValidator.equals(
    "retrieved session ID matches requested session ID",
    session.id,
    sessionId,
  );
}
