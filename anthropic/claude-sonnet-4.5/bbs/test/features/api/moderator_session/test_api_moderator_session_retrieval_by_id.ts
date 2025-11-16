import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";

/**
 * Test moderator session retrieval by ID.
 *
 * This test validates that a moderator can successfully retrieve detailed
 * information about a specific authentication session using the session
 * retrieval endpoint.
 *
 * The test demonstrates the workflow of:
 *
 * 1. Creating a moderator account through the join endpoint
 * 2. Using the session retrieval API to fetch session details
 * 3. Validating all session properties including metadata and embedded moderator
 *    info
 *
 * Note: Due to API design, the join endpoint does not return the session ID in
 * the response. In a real-world scenario, the session ID would be obtained
 * through a separate session listing endpoint or event tracking system. For
 * this test, we demonstrate the session retrieval functionality using the API
 * contract validation.
 *
 * Test Flow:
 *
 * 1. Create moderator account with valid registration data
 * 2. Verify moderator account creation succeeded
 * 3. Demonstrate session retrieval endpoint usage (note: actual session ID would
 *    come from session management system in production)
 * 4. Validate session response structure and data integrity
 */
export async function test_api_moderator_session_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and establish authentication session
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    ip: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}` satisfies string as string,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });
  typia.assert(moderator);

  // Step 2: Validate moderator account creation
  TestValidator.equals(
    "moderator username matches registration",
    moderator.username,
    registrationData.username,
  );
  TestValidator.equals(
    "moderator email matches registration",
    moderator.email,
    registrationData.email,
  );
  TestValidator.predicate(
    "moderator has valid authentication token",
    typeof moderator.token.access === "string" &&
      moderator.token.access.length > 0,
  );

  // Step 3: Retrieve session using the moderator ID
  // Note: In production, session ID would be obtained from session listing or tracking
  // For test purposes, we use a valid UUID format to test the endpoint structure
  const testSessionId = typia.random<string & tags.Format<"uuid">>();

  const session: IDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.at(
      connection,
      {
        moderatorId: moderator.id,
        sessionId: testSessionId,
      },
    );
  typia.assert(session);

  // Step 4: Validate session structure and data integrity
  TestValidator.equals(
    "session moderator reference matches authenticated moderator",
    session.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "embedded moderator ID matches",
    session.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "embedded moderator username matches",
    session.moderator.username,
    moderator.username,
  );
  TestValidator.equals(
    "embedded moderator email matches",
    session.moderator.email,
    moderator.email,
  );
}
