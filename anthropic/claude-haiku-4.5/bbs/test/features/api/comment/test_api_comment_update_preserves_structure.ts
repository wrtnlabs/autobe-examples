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
 * Test that updating a comment preserves all structural information including
 * parent_comment_id, article reference, author, and creation date.
 *
 * This test validates that when a comment is updated, all the structural
 * metadata remains intact:
 *
 * - The parent_comment_id remains unchanged (if it exists)
 * - The article_id reference stays the same
 * - The author information is not modified
 * - The created_at timestamp is preserved
 * - Only the content field is updated
 *
 * The test workflow:
 *
 * 1. Register a new member account
 * 2. Create an article to post comments on
 * 3. Create a parent comment on the article
 * 4. Create a reply comment (child of the parent comment)
 * 5. Update the reply comment's content
 * 6. Verify the updated comment preserves all structural information
 * 7. Verify the parent comment remains unchanged
 * 8. Verify the article reference is maintained
 */
export async function test_api_comment_update_preserves_structure(
  connection: api.IConnection,
) {
  // 1. Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member);

  // 2. Create an article to post comments on
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Test Article for Comment Updates",
        content: "This is a test article with minimum required content length.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  TestValidator.equals("article id is uuid", typeof article.id, "string");

  // 3. Create a parent comment on the article
  const parentComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "This is the parent comment for testing nested replies.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment has article reference",
    parentComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "parent comment has no parent",
    parentComment.parent_comment_id === undefined ||
      parentComment.parent_comment_id === null,
    true,
  );

  const originalParentCreatedAt = parentComment.created_at;
  const originalParentAuthor = parentComment.author.id;

  // 4. Create a reply comment (child of the parent comment)
  const replyComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "This is a reply comment to the parent comment.",
          parent_comment_id: parentComment.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(replyComment);
  TestValidator.equals(
    "reply comment has correct parent",
    replyComment.parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "reply comment has correct article",
    replyComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "reply comment author is the member",
    replyComment.author.id,
    member.id,
  );

  const originalReplyCreatedAt = replyComment.created_at;
  const originalReplyAuthorId = replyComment.author.id;
  const originalReplyContent = replyComment.content;

  // 5. Update the reply comment's content
  const updatedComment =
    await api.functional.discussionBoard.articles.comments.update(connection, {
      articleId: article.id,
      commentId: replyComment.id,
      body: {
        content: "This is the updated reply comment with new content.",
      } satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(updatedComment);

  // 6. Verify the updated comment preserves all structural information
  TestValidator.equals(
    "updated comment preserves parent reference",
    updatedComment.parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "updated comment preserves article reference",
    updatedComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "updated comment preserves author",
    updatedComment.author.id,
    originalReplyAuthorId,
  );
  TestValidator.equals(
    "updated comment preserves creation date",
    updatedComment.created_at,
    originalReplyCreatedAt,
  );
  TestValidator.notEquals(
    "updated comment has different content",
    updatedComment.content,
    originalReplyContent,
  );

  // 7. Verify the parent comment remains unchanged
  TestValidator.equals(
    "parent comment created_at unchanged",
    originalParentCreatedAt,
    parentComment.created_at,
  );
  TestValidator.equals(
    "parent comment author unchanged",
    originalParentAuthor,
    parentComment.author.id,
  );

  // 8. Verify the article reference is maintained
  TestValidator.equals(
    "article id preserved",
    article.id,
    updatedComment.discussion_board_article_id,
  );
}
