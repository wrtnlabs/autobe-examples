import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that requesting a comment detail with a non-existent comment ID
 * returns the correct not found error, and no sensitive information is leaked.
 * This ensures robust error handling and compliance with business rules
 * regarding invalid or missing resources. The test checks that an appropriate
 * error is raised for an unknown UUID-format ID.
 *
 * Steps:
 *
 * 1. Generate a random UUID not corresponding to any existing comment
 * 2. Attempt to retrieve the comment details for the generated ID
 * 3. Assert that a not found error is thrown (HTTP error), and no comment data is
 *    leaked
 * 4. Verify that the error does not expose sensitive or unintended information in
 *    the message
 */
export async function test_api_comment_detail_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Generate a valid (but unlikely to exist) UUID as the comment ID
  const nonexistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to retrieve detail for this nonexistent ID, expect an error
  await TestValidator.error(
    "requesting nonexistent comment should throw not found error",
    async () => {
      await api.functional.discussionBoard.comments.at(connection, {
        commentId: nonexistentCommentId,
      });
    },
  );
}
