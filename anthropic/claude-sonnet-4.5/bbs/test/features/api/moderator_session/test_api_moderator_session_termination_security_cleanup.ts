import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator session termination for security cleanup and session
 * management.
 *
 * This test validates the session deletion endpoint signature and basic
 * functionality. It creates a moderator account with an authentication session,
 * then demonstrates calling the session deletion endpoint.
 *
 * LIMITATION: The current API does not provide a way to retrieve sessionId from
 * the join response or list existing sessions. Therefore, this test uses a
 * generated UUID for sessionId. In a production scenario with complete API
 * coverage, there would be an endpoint to list sessions or the join response
 * would include the sessionId.
 *
 * Workflow:
 *
 * 1. Create a moderator account with authentication session
 * 2. Validate the moderator profile and authentication tokens
 * 3. Call the session deletion endpoint with moderatorId and a sessionId
 * 4. Note: The sessionId used is generated as the actual sessionId cannot be
 *    retrieved
 */
export async function test_api_moderator_session_termination_security_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account with authentication session
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const requestBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: moderatorUsername,
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://discussion-board.example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://discussion-board.example.com/" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: requestBody,
  });

  // Step 2: Validate moderator profile and authentication tokens
  typia.assert(moderator);

  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorUsername,
  );
  TestValidator.predicate("moderator is active", moderator.is_active);
  TestValidator.predicate(
    "access token exists",
    moderator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    moderator.token.refresh.length > 0,
  );

  // Step 3: Attempt to call session deletion endpoint
  // Generate a sessionId since we cannot retrieve the actual session ID from available APIs
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // This call will likely fail with 404 since the sessionId is not real
  // In a complete implementation, we would first retrieve the actual sessionId
  await TestValidator.error(
    "session deletion with non-existent sessionId should fail",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.sessions.erase(
        connection,
        {
          moderatorId: moderator.id,
          sessionId: sessionId,
        },
      );
    },
  );
}
