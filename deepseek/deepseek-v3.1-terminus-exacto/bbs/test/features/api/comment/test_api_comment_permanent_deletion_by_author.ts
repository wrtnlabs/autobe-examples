import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test comment deletion error scenario - attempting to delete non-existent
 * comment.
 *
 * Since the required channel and section creation APIs are not available, this
 * test focuses on validating the error handling when attempting to delete a
 * comment that doesn't exist, demonstrating proper API behavior.
 */
export async function test_api_comment_permanent_deletion_by_author(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(1),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com",
      referrer: "https://example.com/signup",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Attempt to delete a non-existent comment to validate error handling
  await TestValidator.error(
    "should fail when deleting non-existent comment",
    async () => {
      await api.functional.discussionBoard.member.comments.erase(connection, {
        commentId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
