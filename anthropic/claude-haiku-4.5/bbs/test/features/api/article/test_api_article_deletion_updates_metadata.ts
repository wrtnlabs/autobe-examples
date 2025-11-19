import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that article metadata is properly updated during deletion.
 *
 * Creates an article with specific content, title, category, and timestamps.
 * Deletes the article and verifies that:
 *
 * - The deleted_at timestamp is set
 * - The updated_at timestamp reflects the deletion time
 * - The status field changes to 'deleted'
 * - The article retains all original content and author information for audit
 *   purposes
 * - The response includes complete article data with deletion metadata intact
 */
export async function test_api_article_deletion_updates_metadata(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a contributor
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor is authenticated",
    contributor.id.length > 0,
  );
  TestValidator.equals(
    "contributor account status",
    contributor.account_status,
    "active",
  );

  // Step 2: Create an article with specific metadata
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "https://example.com/articles/create",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Verify article was created correctly
  TestValidator.equals(
    "article author ID matches",
    article.author.id,
    contributor.id,
  );
  TestValidator.equals("article title matches", article.title, articleTitle);
  TestValidator.equals(
    "article content matches",
    article.content,
    articleContent,
  );
  TestValidator.equals("article status is draft", article.status, "draft");
  TestValidator.predicate(
    "deleted_at is null on creation",
    article.deleted_at === null || article.deleted_at === undefined,
  );

  const createdAtTime = new Date(article.created_at);
  const updatedAtTime = new Date(article.updated_at);
  TestValidator.predicate(
    "created_at and updated_at are set",
    createdAtTime.getTime() <= updatedAtTime.getTime(),
  );

  // Step 3: Delete the article
  const beforeDeletion = new Date();
  const deletedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.erase(
      connection,
      {
        articleId: article.id,
      },
    );
  const afterDeletion = new Date();
  typia.assert(deletedArticle);

  // Step 4: Verify deletion metadata
  TestValidator.equals(
    "deleted article ID matches original",
    deletedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "deleted article status is deleted",
    deletedArticle.status,
    "deleted",
  );
  TestValidator.equals(
    "deleted article title preserved",
    deletedArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "deleted article content preserved",
    deletedArticle.content,
    articleContent,
  );
  TestValidator.equals(
    "deleted article author preserved",
    deletedArticle.author.id,
    contributor.id,
  );

  // Verify deleted_at timestamp is set and recent
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );

  if (deletedArticle.deleted_at) {
    const deletedAtTime = new Date(deletedArticle.deleted_at);
    TestValidator.predicate(
      "deleted_at is within 60 seconds of deletion",
      deletedAtTime.getTime() >= beforeDeletion.getTime() - 1000 &&
        deletedAtTime.getTime() <= afterDeletion.getTime() + 1000,
    );
  }

  // Verify updated_at timestamp reflects deletion
  const updatedAtAfterDeletion = new Date(deletedArticle.updated_at);
  TestValidator.predicate(
    "updated_at reflects deletion time",
    updatedAtAfterDeletion.getTime() >= beforeDeletion.getTime() - 1000 &&
      updatedAtAfterDeletion.getTime() <= afterDeletion.getTime() + 1000,
  );

  // Verify category is preserved
  TestValidator.predicate(
    "category is preserved in deleted article",
    deletedArticle.category !== null && deletedArticle.category !== undefined,
  );
}
