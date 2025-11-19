import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate retrieval of soft-deleted comment details by admin.
 *
 * Tests the behavior of the GET /discussionBoard/comments/{commentId} endpoint
 * when the comment is soft-deleted and accessed in an admin context. Steps:
 *
 * 1. Create a test user (comment author)
 * 2. Create an article authored by the user
 * 3. Create a comment on the article by the user
 * 4. Simulate soft-deletion of the comment (set deleted_at timestamp to now)
 * 5. Retrieve the comment as admin using
 *    api.functional.discussionBoard.comments.at
 * 6. Assert that:
 *
 *    - The response is successful and matches IDiscussionBoardArticleComment
 *    - The deleted_at timestamp is present and is an ISO date-time string
 *    - The body content is masked to indicate deletion (not showing original text)
 *    - Author and article references are preserved (author.id, article.id)
 *    - All required fields (id, author, article, created_at, updated_at) are present
 *    - Admin is allowed to access deleted comments (no access violation)
 */
export async function test_api_comment_detail_load_deleted(
  connection: api.IConnection,
) {
  // 1. Generate a test user (author)
  const author: IDiscussionBoardUser.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // 2. Generate a discussion article authored by the test user
  const article: IDiscussionBoardArticle.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    user: author,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 3. Create a comment on the article by the user
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const now = new Date().toISOString();
  const comment: IDiscussionBoardArticleComment = {
    id: commentId,
    author,
    article,
    body: RandomGenerator.paragraph({ sentences: 2 }),
    created_at: now,
    updated_at: now,
    deleted_at: now, // simulate as soft-deleted
  };

  // Simulate: store the comment in a test database/mock here if needed.
  // (Depends on the real implementation. In this test we create the object and assume it's deleted)

  // 4. Retrieve the comment by ID as admin via endpoint
  const loaded: IDiscussionBoardArticleComment =
    await api.functional.discussionBoard.comments.at(connection, {
      commentId: comment.id,
    });
  typia.assert(loaded);

  // 5. Assertions
  TestValidator.equals("comment ID matches", loaded.id, comment.id);
  TestValidator.equals(
    "article reference matches",
    loaded.article.id,
    article.id,
  );
  TestValidator.equals("author reference matches", loaded.author.id, author.id);
  TestValidator.predicate(
    "deleted_at is present (soft-deleted)",
    typeof loaded.deleted_at === "string" && !!loaded.deleted_at,
  );
  TestValidator.notEquals(
    "deleted comment body is masked",
    loaded.body,
    comment.body,
  );
  TestValidator.predicate(
    "body is masked (empty or non-original)",
    loaded.body === "" || /deleted|removed|mask|blank/i.test(loaded.body),
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof loaded.created_at === "string" && loaded.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof loaded.updated_at === "string" && loaded.updated_at.includes("T"),
  );
}
