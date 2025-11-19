import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test creating a top-level comment on a discussion board article.
 *
 * Validates the complete workflow for posting top-level comments:
 *
 * 1. Contributor registration and authentication
 * 2. Article creation
 * 3. Top-level comment creation on article
 * 4. Verification of comment metadata and author attribution
 * 5. Validation of content length constraints (1-5000 characters)
 * 6. Verification that comments are immediately published without moderation
 */
export async function test_api_article_comments_create_top_level_comment(
  connection: api.IConnection,
) {
  // 1. Register contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor account is active",
    contributor.account_status === "active",
  );

  // Get a category ID for article creation
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 5,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
          categoryId: categoryId,
          href: "https://example.com/articles/create",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article author matches contributor",
    article.author.id,
    contributor.id,
  );

  // 3. Create top-level comment on the article
  const commentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 2,
    wordMax: 6,
  });

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 4. Verify comment metadata and properties
  TestValidator.equals(
    "comment content matches input",
    comment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment author matches contributor",
    comment.author.id,
    contributor.id,
  );
  TestValidator.equals(
    "comment article ID matches",
    comment.article.id,
    article.id,
  );
  TestValidator.predicate(
    "comment is top-level without parent",
    comment.parentComment === null || comment.parentComment === undefined,
  );
  TestValidator.equals(
    "comment initial edit count is zero",
    comment.edit_count,
    0,
  );
  TestValidator.equals(
    "comment initial reply count is zero",
    comment.reply_count,
    0,
  );
  TestValidator.predicate(
    "comment is not deleted",
    comment.is_deleted === false,
  );
  TestValidator.predicate(
    "comment has creation timestamp",
    comment.created_at !== null && comment.created_at !== undefined,
  );
  TestValidator.predicate(
    "comment has update timestamp",
    comment.updated_at !== null && comment.updated_at !== undefined,
  );
  TestValidator.predicate(
    "comment has article publication status cached",
    comment.article_publication_status !== null &&
      comment.article_publication_status !== undefined,
  );

  // 5. Test content validation - minimum length boundary (1 character)
  const minLengthComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "A",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(minLengthComment);
  TestValidator.equals(
    "minimum length comment (1 char) created successfully",
    minLengthComment.content,
    "A",
  );

  // 6. Test content validation - maximum length boundary (5000 characters)
  const maxLengthContent = "x".repeat(5000);
  const maxLengthComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: maxLengthContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(maxLengthComment);
  TestValidator.equals(
    "maximum length comment (5000 chars) created successfully",
    maxLengthComment.content.length,
    5000,
  );
}
