import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test error handling with invalid (non-existent) article IDs.
 *
 * This test validates that the API properly handles error scenarios when
 * attempting to retrieve comments for articles that don't exist in the system.
 *
 * The test uses properly formatted UUIDs (which pass TypeScript validation) but
 * specifies articles that don't exist, validating the API's runtime business
 * logic error handling.
 *
 * Note: Type format validation (UUID syntax checking) is a compile-time
 * responsibility and is not tested here. This test focuses on runtime business
 * logic - what happens when valid types reference non-existent resources.
 */
export async function test_api_article_comments_invalid_article_id(
  connection: api.IConnection,
) {
  // Test: Request with non-existent article UUID
  // Using a properly formatted UUID that doesn't exist in the database
  await TestValidator.error(
    "should fail when retrieving comments for non-existent article",
    async () => {
      const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.discussionBoard.articles.comments.index(connection, {
        articleId: nonExistentArticleId,
        body: {} satisfies IDiscussionBoardComment.IRequest,
      });
    },
  );
}
