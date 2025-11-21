import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IColorClass } from "@ORGANIZATION/PROJECT-api/lib/structures/IColorClass";
import type { IIconClass } from "@ORGANIZATION/PROJECT-api/lib/structures/IIconClass";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallFaqArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaqArticle";
import type { IShoppingMallFaqCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaqCategory";

/**
 * Test that customers can retrieve published FAQ articles using the article
 * code for public access. The test validates successful article retrieval with
 * complete content including title, slug, content, excerpt, category
 * information, author details, engagement metrics (view_count, helpful_votes,
 * total_votes), and proper difficulty classification. Ensures that articles are
 * accessible through their URL-friendly articleCode for SEO optimization and
 * direct article access, validating the complete response structure including
 * metadata and organizational relationships.
 */
export async function test_api_faq_article_retrieval_public_access(
  connection: api.IConnection,
) {
  // Generate a realistic article code for testing
  const articleCode = typia.random<string>();

  // Retrieve FAQ article using the article code
  const article: IShoppingMallFaqArticle =
    await api.functional.shoppingMall.faqArticles.at(connection, {
      articleCode,
    });

  // Validate complete response structure
  typia.assert(article);

  // Validate essential business logic that typia doesn't cover
  TestValidator.predicate(
    "article slug matches article code",
    article.slug === articleCode,
  );
  TestValidator.predicate(
    "article is accessible",
    article.published_at !== null,
  );
  TestValidator.predicate(
    "total votes should be non-negative when positive helpful votes exist",
    article.helpful_votes === 0 || article.total_votes > 0,
  );
  TestValidator.predicate(
    "helpful votes should not exceed total votes",
    article.helpful_votes <= article.total_votes,
  );

  console.log(
    `✅ Successfully retrieved FAQ article "${article.title}" (status: ${article.status}, views: ${article.view_count})`,
  );
}
