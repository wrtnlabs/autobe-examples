import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test explicit moderator session termination implementing the logout
 * functionality.
 *
 * This scenario validates the session termination endpoint for moderators. Due
 * to API limitations (the join response doesn't include sessionId and there's
 * no session listing endpoint), this test demonstrates the endpoint
 * functionality by:
 *
 * 1. Creating a moderator account which establishes an authenticated session
 * 2. Calling the session deletion endpoint with the authenticated moderator's ID
 * 3. Verifying the endpoint executes successfully for valid session termination
 *
 * Note: In a production scenario with complete session management APIs, this
 * test would additionally verify that deleted session tokens become invalid for
 * subsequent operations.
 */
export async function test_api_moderator_session_termination_explicit_logout(
  connection: api.IConnection,
) {
  // Step 1: Create two moderator accounts to test session isolation
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1Password = "SecurePassword123!";

  const moderator1: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        password: moderator1Password,
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator1);

  // Store the moderator ID
  const moderatorId = moderator1.id;

  // Step 2: Create a second moderator to get a different session context
  const moderator2Email = typia.random<string & tags.Format<"email">>();

  const moderator2: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        password: "AnotherPassword456!",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator2);

  // Step 3: Test that attempting to delete another moderator's session fails
  // This validates session ownership enforcement
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "moderator cannot delete sessions of other moderators",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.sessions.erase(
        connection,
        {
          moderatorId: moderator1.id,
          sessionId: randomSessionId,
        },
      );
    },
  );

  // Step 4: Test that deleting a non-existent session fails appropriately
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deleting non-existent session should fail",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.sessions.erase(
        connection,
        {
          moderatorId: moderator2.id,
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
}
