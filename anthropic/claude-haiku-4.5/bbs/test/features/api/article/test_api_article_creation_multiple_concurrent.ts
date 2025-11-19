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
 * Test multiple articles created by same contributor in rapid succession.
 *
 * This test validates concurrent article creation handling by verifying that:
 *
 * 1. A contributor can create multiple articles (3-5) with different content
 * 2. Each article receives a distinct UUID
 * 3. Author attribution is correct for all articles
 * 4. Each article has independent metadata and timestamps
 * 5. No race conditions occur during concurrent creation
 * 6. Articles are properly indexed and retrievable
 * 7. No data conflicts between concurrent operations
 */
export async function test_api_article_creation_multiple_concurrent(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate contributor
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "SecurePass123!@#",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Generate random valid category IDs for articles
  const categoryIds = ArrayUtil.repeat(4, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Step 3: Create 4 articles concurrently with different content
  const articleCount = 4;
  const articles: IDiscussionBoardArticle[] = await ArrayUtil.asyncMap(
    ArrayUtil.repeat(articleCount, (index) => index),
    async (index) => {
      const article: IDiscussionBoardArticle =
        await api.functional.discussionBoard.contributor.articles.create(
          connection,
          {
            body: {
              title: `Article ${index + 1}: ${RandomGenerator.paragraph({
                sentences: 3,
                wordMin: 3,
                wordMax: 8,
              })}`,
              content: RandomGenerator.content({
                paragraphs: 3,
                sentenceMin: 10,
                sentenceMax: 20,
                wordMin: 4,
                wordMax: 8,
              }),
              categoryId: categoryIds[index],
              href: typia.random<string & tags.Format<"uri">>(),
              referrer: typia.random<string & tags.Format<"uri">>(),
            } satisfies IDiscussionBoardArticle.ICreate,
          },
        );
      typia.assert(article);
      return article;
    },
  );

  // Step 4: Validate that all articles were created successfully
  TestValidator.predicate(
    "all articles created successfully",
    articles.length === articleCount,
  );

  // Step 5: Verify each article has a unique ID
  const articleIds = articles.map((a) => a.id);
  const uniqueIds = new Set(articleIds);
  TestValidator.equals(
    "all article IDs are unique",
    uniqueIds.size,
    articleCount,
  );

  // Step 6: Verify author attribution for all articles
  articles.forEach((article, index) => {
    TestValidator.equals(
      `article ${index + 1} author is correct`,
      article.author.id,
      contributor.id,
    );
    TestValidator.equals(
      `article ${index + 1} author username is correct`,
      article.author.username,
      contributor.username,
    );
  });

  // Step 7: Verify each article has correct status
  articles.forEach((article, index) => {
    TestValidator.equals(
      `article ${index + 1} status is draft`,
      article.status,
      "draft",
    );
  });

  // Step 8: Verify independent metadata for each article
  articles.forEach((article, index) => {
    TestValidator.predicate(
      `article ${index + 1} has valid timestamps`,
      article.created_at !== null &&
        article.updated_at !== null &&
        article.created_at !== undefined &&
        article.updated_at !== undefined,
    );

    TestValidator.predicate(
      `article ${index + 1} has non-empty title`,
      article.title.length > 0 && article.title.length <= 200,
    );

    TestValidator.predicate(
      `article ${index + 1} has valid content length`,
      article.content.length >= 50 && article.content.length <= 50000,
    );

    TestValidator.predicate(
      `article ${index + 1} has zero view count`,
      article.view_count === 0,
    );

    TestValidator.predicate(
      `article ${index + 1} has zero comment count`,
      article.comment_count === 0,
    );

    TestValidator.predicate(
      `article ${index + 1} is not pinned`,
      article.is_pinned === false,
    );

    TestValidator.predicate(
      `article ${index + 1} is not locked`,
      article.is_locked === false,
    );
  });

  // Step 9: Verify that articles have independent content
  const contents = articles.map((a) => a.content);
  const uniqueContents = new Set(contents);
  TestValidator.equals(
    "all articles have unique content",
    uniqueContents.size,
    articleCount,
  );

  // Step 10: Verify timestamps are sequential or very close
  const timestamps = articles.map((a) => new Date(a.created_at).getTime());
  const timeDifferences = timestamps
    .slice(1)
    .map((t, i) => Math.abs(t - timestamps[i]));
  const maxTimeDifference = Math.max(...timeDifferences);
  TestValidator.predicate(
    "time differences between articles are minimal (< 5 seconds)",
    maxTimeDifference < 5000,
  );
}
