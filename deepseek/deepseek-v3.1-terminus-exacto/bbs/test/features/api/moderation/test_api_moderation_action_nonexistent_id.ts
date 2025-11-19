import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Test retrieval attempt for a non-existent moderation action ID.
 *
 * This test validates that the API properly handles requests for non-existent
 * moderation actions by returning appropriate error responses. It ensures that
 * authenticated moderators receive graceful error handling when attempting to
 * access moderation actions that don't exist in the system, maintaining
 * security and system integrity.
 *
 * Steps:
 *
 * 1. Authenticate a moderator to establish proper authorization context
 * 2. Generate a valid but non-existent UUID for the moderation action
 * 3. Attempt to retrieve the non-existent moderation action
 * 4. Verify that the API correctly returns an error response
 */
export async function test_api_moderation_action_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Authenticate moderator to establish authorization context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.paragraph({ sentences: 2 }),
      password: "securePassword123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      moderation_level: "basic",
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Generate a valid but non-existent UUID for the moderation action
  const nonExistentActionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to retrieve the non-existent moderation action
  await TestValidator.error(
    "retrieving non-existent moderation action should fail",
    async () => {
      await api.functional.discussionBoard.moderator.moderationActions.at(
        connection,
        {
          actionId: nonExistentActionId,
        },
      );
    },
  );
}
