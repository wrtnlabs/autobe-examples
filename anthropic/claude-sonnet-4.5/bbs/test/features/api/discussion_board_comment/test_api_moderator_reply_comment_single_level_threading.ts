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
 * Test moderator creating a reply comment to an existing top-level comment,
 * validating single-level threading functionality.
 *
 * This test validates the single-level comment threading system by creating a
 * moderator account, establishing the necessary article infrastructure, posting
 * a top-level comment, and then creating a reply comment that references the
 * parent. The test confirms proper threading relationships and single-level
 * constraint enforcement.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Create a category for article organization
 * 3. Create an article to host the comment thread
 * 4. Post a top-level comment on the article
 * 5. Post a reply comment referencing the top-level comment as parent
 * 6. Validate both comments were created with proper structure
 * 7. Verify the reply correctly references the parent comment ID
 * 8. Confirm threading relationship and single-level constraint
 */
export async function test_api_moderator_reply_comment_single_level_threading(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderatorBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // Step 2: Create a category for article creation
  const categoryBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Step 3: Create an article to host the comment thread
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // Step 4: Post a top-level comment on the article
  const topLevelCommentBody = {
    discussion_board_article_id: article.id,
    content: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const topLevelComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: topLevelCommentBody,
      },
    );
  typia.assert(topLevelComment);

  // Validate top-level comment structure
  TestValidator.equals(
    "top-level comment has no parent",
    topLevelComment.discussion_board_parent_comment_id,
    null,
  );
  TestValidator.equals(
    "top-level comment article ID matches",
    topLevelComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "top-level comment author type is moderator",
    topLevelComment.author_type,
    "moderator",
  );

  // Step 5: Post a reply comment referencing the top-level comment as parent
  const replyCommentBody = {
    discussion_board_article_id: article.id,
    discussion_board_parent_comment_id: topLevelComment.id,
    content: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const replyComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: replyCommentBody,
      },
    );
  typia.assert(replyComment);

  // Step 6-8: Validate reply comment structure and threading relationship
  TestValidator.equals(
    "reply comment has parent reference",
    replyComment.discussion_board_parent_comment_id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "reply comment article ID matches",
    replyComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "reply comment author type is moderator",
    replyComment.author_type,
    "moderator",
  );
  TestValidator.predicate(
    "reply comment content is not empty",
    replyComment.content.length > 0,
  );
  TestValidator.predicate(
    "reply comment has valid created timestamp",
    new Date(replyComment.created_at).getTime() > 0,
  );
  TestValidator.equals(
    "both comments belong to same article",
    topLevelComment.discussion_board_article_id,
    replyComment.discussion_board_article_id,
  );
}
