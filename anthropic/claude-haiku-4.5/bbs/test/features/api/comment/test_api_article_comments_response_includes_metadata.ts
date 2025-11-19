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
 * Validate comment creation response includes all required metadata.
 *
 * Tests that when a comment is created on an article, the response includes
 * complete metadata: id (UUID), content, author summary, article summary,
 * creation/update timestamps, deletion flag, edit count, reply count, cached
 * article publication status, and attachments array.
 *
 * Test flow:
 *
 * 1. Register contributor via authentication endpoint
 * 2. Create article with required fields
 * 3. Create comment on article
 * 4. Validate response includes all metadata fields with correct structure
 */
export async function test_api_article_comments_response_includes_metadata(
  connection: api.IConnection,
) {
  // 1. Register a new contributor
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: "TestPass123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 2. Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/article/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Create a comment on the article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 4. Validate all required metadata fields exist and have correct structure
  TestValidator.predicate(
    "comment has valid UUID id",
    comment.id !== undefined && comment.id.length > 0,
  );

  TestValidator.predicate(
    "comment content is present and non-empty",
    comment.content !== undefined && comment.content.length > 0,
  );

  TestValidator.predicate(
    "author summary has id and username",
    comment.author !== undefined &&
      comment.author.id !== undefined &&
      comment.author.username !== undefined,
  );

  TestValidator.predicate(
    "article summary has id and title",
    comment.article !== undefined &&
      comment.article.id !== undefined &&
      comment.article.title !== undefined,
  );

  TestValidator.predicate(
    "created_at timestamp is present",
    comment.created_at !== undefined && comment.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at timestamp is present",
    comment.updated_at !== undefined && comment.updated_at.length > 0,
  );

  TestValidator.equals(
    "is_deleted is false for new comment",
    comment.is_deleted,
    false,
  );

  TestValidator.equals(
    "edit_count is 0 for new comment",
    comment.edit_count,
    0,
  );

  TestValidator.equals(
    "reply_count is 0 for new comment",
    comment.reply_count,
    0,
  );

  TestValidator.predicate(
    "article_publication_status is present",
    comment.article_publication_status !== undefined &&
      comment.article_publication_status.length > 0,
  );

  TestValidator.predicate(
    "attachments is empty array for new comment without files",
    Array.isArray(comment.attachments) && comment.attachments.length === 0,
  );
}
