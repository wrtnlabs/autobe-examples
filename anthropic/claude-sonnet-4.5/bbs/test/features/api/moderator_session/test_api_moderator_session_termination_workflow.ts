import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";

/**
 * Test the moderator session termination workflow.
 *
 * This test validates that moderators can successfully register on the platform
 * and that the session deletion API endpoint is properly structured and
 * callable.
 *
 * NOTE: Complete end-to-end validation of session deletion requires the session
 * ID from the registration process. Since the current API structure does not
 * expose the session ID in the registration response, this test demonstrates:
 *
 * 1. Successful moderator registration with session creation
 * 2. Proper authentication token generation
 * 3. Session deletion endpoint invocation with valid UUID format
 *
 * In a production environment, the session ID would typically be:
 *
 * - Included in the registration response, OR
 * - Retrieved via a session listing endpoint, OR
 * - Embedded in the authentication token payload
 */
export async function test_api_moderator_session_termination_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with initial session
  const createData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createData,
    });
  typia.assert(moderator);

  // Verify moderator registration was successful
  TestValidator.equals(
    "moderator email should match registration input",
    moderator.email,
    createData.email,
  );

  TestValidator.equals(
    "moderator username should match registration input",
    moderator.username,
    createData.username,
  );

  // Step 2: Demonstrate session deletion endpoint call
  // Using the moderator ID from registration and a properly formatted session ID
  const moderatorId: string & tags.Format<"uuid"> = moderator.id;
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Call session deletion endpoint
  // Note: This will fail at runtime because the session ID doesn't exist,
  // but it validates the endpoint structure and parameter types
  await TestValidator.error(
    "deleting non-existent session should fail",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.sessions.erase(
        connection,
        {
          moderatorId: moderatorId,
          sessionId: sessionId,
        },
      );
    },
  );
}
