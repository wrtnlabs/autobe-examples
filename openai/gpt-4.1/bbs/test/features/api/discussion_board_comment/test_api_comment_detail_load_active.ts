import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate retrieval of active discussion board comment details by ID.
 *
 * This test verifies the correct behavior of the API for loading a non-deleted
 * (active) comment by its unique ID:
 *
 * - Ensures the returned object conforms to the IDiscussionBoardArticleComment
 *   type
 * - Validates that all fields (id, author, article, body, created_at, updated_at,
 *   deleted_at) exist
 * - Verifies that the author and article references are embedded using their
 *   respective summary objects
 * - Confirms that the comment body, timestamps, and references match expectations
 *   for an active comment (deleted_at should be null or undefined)
 */
export async function test_api_comment_detail_load_active(
  connection: api.IConnection,
) {
  // Prepare a random commentId (valid UUID format)
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // Call the comment detail API
  const comment = await api.functional.discussionBoard.comments.at(connection, {
    commentId,
  });
  typia.assert(comment);

  // Verify the shape and structure
  TestValidator.equals("comment.id matches request id", comment.id, commentId);
  TestValidator.predicate(
    "active comment should have deleted_at null or undefined",
    comment.deleted_at === null || comment.deleted_at === undefined,
  );
  TestValidator.predicate(
    "author summary exists",
    !!comment.author && !!comment.author.id,
  );
  TestValidator.predicate(
    "article summary exists",
    !!comment.article && !!comment.article.id,
  );
  TestValidator.predicate(
    "body is non-empty",
    typeof comment.body === "string" && comment.body.trim().length > 0,
  );
  TestValidator.predicate(
    "creation timestamp is ISO date-time string",
    typeof comment.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(comment.created_at),
  );
  TestValidator.predicate(
    "updated_at timestamp is ISO date-time string",
    typeof comment.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(comment.updated_at),
  );
}
