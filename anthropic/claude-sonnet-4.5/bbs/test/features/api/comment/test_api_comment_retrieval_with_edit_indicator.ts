import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test retrieval of an edited comment to verify edit indicators are properly
 * displayed.
 *
 * This test validates that comment modification history is transparent through
 * timestamp tracking. When a comment is edited, the system must maintain the
 * original created_at timestamp while updating the updated_at timestamp to
 * reflect the modification time. This provides users with clear visibility into
 * content edit history.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account
 * 2. Create a category for article organization
 * 3. Create an article to host the comment
 * 4. Post a comment on the article
 * 5. Edit the comment content
 * 6. Retrieve the edited comment
 * 7. Validate edit indicators through timestamp comparison
 */
export async function test_api_comment_retrieval_with_edit_indicator(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorData = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a category for article creation
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create an article as a moderator
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    summary: RandomGenerator.paragraph({ sentences: 1 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 4: Post a comment on the article
  const originalCommentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const commentData = {
    discussion_board_article_id: article.id,
    discussion_board_parent_comment_id: null,
    content: originalCommentContent,
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Step 5: Update the comment content (edit the comment)
  const updatedCommentContent = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 5,
    wordMax: 9,
  });
  const updateData = {
    content: updatedCommentContent,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: updateData,
      },
    );
  typia.assert(updatedComment);

  // Step 6: Retrieve the edited comment by its ID
  const retrievedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.at(connection, {
      articleId: article.id,
      commentId: comment.id,
    });
  typia.assert(retrievedComment);

  // Step 7: Validate created_at and updated_at timestamps are different
  TestValidator.predicate(
    "created_at and updated_at timestamps should differ after edit",
    retrievedComment.created_at !== retrievedComment.updated_at,
  );

  // Step 8: Verify edit indicator is present (updated_at > created_at)
  const createdTime = new Date(retrievedComment.created_at).getTime();
  const updatedTime = new Date(retrievedComment.updated_at).getTime();

  TestValidator.predicate(
    "updated_at should be greater than created_at for edited comment",
    updatedTime > createdTime,
  );

  // Step 9: Verify updated content is returned
  TestValidator.equals(
    "retrieved comment content should match updated content",
    retrievedComment.content,
    updatedCommentContent,
  );

  // Step 10: Verify modification timestamp is accurate
  TestValidator.equals(
    "retrieved comment ID should match original comment ID",
    retrievedComment.id,
    comment.id,
  );

  TestValidator.equals(
    "retrieved comment article ID should match",
    retrievedComment.discussion_board_article_id,
    article.id,
  );
}
