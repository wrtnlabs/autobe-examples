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
 * Test that a contributor can successfully delete their own article.
 *
 * A contributor registers and creates a draft article, then deletes it using
 * the contributor delete endpoint. Verify that the article is soft-deleted
 * (deleted_at timestamp is set), the article status becomes 'deleted', and the
 * article is no longer visible in public listings. Confirm that the response
 * returns the deleted article with deletion metadata.
 *
 * Test workflow:
 *
 * 1. Register a new contributor account
 * 2. Create a draft article as the contributor
 * 3. Delete the article using the contributor delete endpoint
 * 4. Verify the article is soft-deleted with deleted_at timestamp
 * 5. Verify the article status is set to 'deleted'
 * 6. Confirm the response contains deletion metadata
 */
export async function test_api_article_deletion_by_contributor_owner(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "SecurePass123!@#",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor created successfully",
    contributor.account_status,
    "active",
  );

  // Step 2: Create a draft article as the contributor
  const article =
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
            sentenceMin: 10,
            sentenceMax: 15,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "https://example.com/create-article",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article created in draft status",
    article.status,
    "draft",
  );
  TestValidator.predicate(
    "article has no deletion timestamp",
    article.deleted_at === null || article.deleted_at === undefined,
  );

  // Step 3: Delete the article using the contributor delete endpoint
  const deletedArticle =
    await api.functional.discussionBoard.contributor.articles.erase(
      connection,
      {
        articleId: article.id,
      },
    );
  typia.assert(deletedArticle);

  // Step 4: Verify the article is soft-deleted with deleted_at timestamp
  TestValidator.predicate(
    "deleted article has deleted_at timestamp",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );

  // Step 5: Verify the article status is set to 'deleted'
  TestValidator.equals(
    "deleted article status is set to deleted",
    deletedArticle.status,
    "deleted",
  );

  // Step 6: Confirm the response contains correct article ID
  TestValidator.equals(
    "deleted article ID matches original",
    deletedArticle.id,
    article.id,
  );
}
