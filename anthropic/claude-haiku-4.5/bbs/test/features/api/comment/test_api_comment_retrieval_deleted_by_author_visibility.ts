import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that deleted comments show appropriate status indicator to regular
 * users.
 *
 * Validates that when a comment has been deleted by its author (soft-deleted
 * with deleted_at timestamp), the comment is displayed with status "deleted"
 * rather than original content, preserving thread context while indicating
 * deletion.
 *
 * This test performs the following steps:
 *
 * 1. Create a member account to post and delete the comment
 * 2. Create an article to post the comment on
 * 3. Post a comment on the article
 * 4. Delete the comment by the author
 * 5. Retrieve the comment and verify it shows deleted status
 * 6. Confirm deleted_at timestamp is set
 * 7. Verify author and thread context are preserved
 */
export async function test_api_comment_retrieval_deleted_by_author_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123",
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorizedMember);
  TestValidator.predicate(
    "member created successfully",
    () => authorizedMember.id !== null,
  );

  // Step 2: Create an article on the discussion board
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);
  TestValidator.predicate(
    "article created successfully",
    () => article.id !== null,
  );

  // Step 3: Post a comment on the article
  const commentData = {
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);
  TestValidator.predicate(
    "comment created successfully",
    () => comment.id !== null,
  );
  TestValidator.equals(
    "initial comment status is published",
    comment.status,
    "published",
  );
  TestValidator.predicate(
    "initial comment has no deleted_at timestamp",
    () => comment.deleted_at === null || comment.deleted_at === undefined,
  );

  // Step 4: Delete the comment
  await api.functional.discussionBoard.member.articles.comments.erase(
    connection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );

  // Step 5: Retrieve the deleted comment and verify deletion status
  const deletedComment =
    await api.functional.discussionBoard.articles.comments.at(connection, {
      articleId: article.id,
      commentId: comment.id,
    });
  typia.assert(deletedComment);

  // Step 6 & 7: Verify deleted status and preserved context
  TestValidator.equals(
    "deleted comment has deleted status",
    deletedComment.status,
    "deleted",
  );

  TestValidator.predicate(
    "deleted comment has deleted_at timestamp",
    () =>
      deletedComment.deleted_at !== null &&
      deletedComment.deleted_at !== undefined,
  );

  TestValidator.equals(
    "author information is preserved",
    deletedComment.author.id,
    comment.author.id,
  );

  TestValidator.equals(
    "creation timestamp is preserved",
    deletedComment.created_at,
    comment.created_at,
  );

  TestValidator.equals("comment ID matches", deletedComment.id, comment.id);

  TestValidator.predicate(
    "thread context preserved - comment still exists in thread",
    () => deletedComment.discussion_board_article_id === article.id,
  );
}
