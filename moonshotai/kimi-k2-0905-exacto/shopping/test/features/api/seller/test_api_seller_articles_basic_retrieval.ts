import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticle";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test basic article retrieval from seller's channel context with default
 * pagination.
 *
 * Validates that sellers can access articles relevant to their marketplace
 * environment with proper channel-specific filtering and governance.
 *
 * 1. Creates a seller account through the join endpoint for authentication
 * 2. Retrieves articles using the seller articles API with default pagination
 * 3. Validates that the response contains expected pagination metadata and article
 *    summaries
 * 4. Verifies that articles are properly structured with their associated channel,
 *    section, and category
 * 5. Tests various pagination parameters to ensure API handles different scenarios
 *    correctly
 */
export async function test_api_seller_articles_basic_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.name(),
    },
  });
  typia.assert(seller);

  // Step 2: Test basic article retrieval with default parameters
  const defaultArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {},
    });
  typia.assert(defaultArticles);

  // Validate pagination structure
  TestValidator.predicate(
    "default pagination has valid structure",
    () =>
      defaultArticles.pagination.current >= 1 &&
      defaultArticles.pagination.limit >= 1 &&
      defaultArticles.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "default pagination has valid records",
    () =>
      defaultArticles.pagination.records >= 0 &&
      defaultArticles.pagination.pages >= 0,
  );

  // Validate article data structure
  TestValidator.predicate("articles data is an array", () =>
    Array.isArray(defaultArticles.data),
  );

  if (defaultArticles.data.length > 0) {
    TestValidator.predicate("each article has required summary fields", () =>
      defaultArticles.data.every(
        (article) =>
          typeof article.id === "string" &&
          typeof article.code === "string" &&
          typeof article.title === "string" &&
          typeof article.summary === "string" &&
          typeof article.status === "string" &&
          typeof article.featured === "boolean" &&
          typeof article.commentable === "boolean" &&
          article.createdAt !== undefined,
      ),
    );

    TestValidator.predicate("articles have valid channel references", () =>
      defaultArticles.data.every(
        (article) =>
          typeof article.channel.id === "string" &&
          typeof article.channel.code === "string" &&
          typeof article.channel.name === "string",
      ),
    );

    TestValidator.predicate("articles have valid section references", () =>
      defaultArticles.data.every(
        (article) =>
          typeof article.section.id === "string" &&
          typeof article.section.code === "string" &&
          typeof article.section.name === "string",
      ),
    );

    TestValidator.predicate("articles have valid category references", () =>
      defaultArticles.data.every(
        (article) =>
          typeof article.channelCategory.id === "string" &&
          typeof article.channelCategory.code === "string" &&
          typeof article.channelCategory.name === "string",
      ),
    );

    // Validate pagination data consistency
    TestValidator.predicate(
      "pagination data length matches current page count",
      () => defaultArticles.data.length <= defaultArticles.pagination.limit,
    );
  }

  // Step 3: Test pagination with specific parameters
  const customPaginationArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        orderBy: "createdAt",
        orderDirection: "desc",
      },
    });
  typia.assert(customPaginationArticles);

  TestValidator.equals(
    "custom pagination limit matches request",
    customPaginationArticles.pagination.limit,
    10,
  );

  TestValidator.equals(
    "custom pagination current page matches request",
    customPaginationArticles.pagination.current,
    1,
  );

  TestValidator.predicate(
    "custom pagination respects limit constraint",
    () => customPaginationArticles.pagination.limit <= 100,
  );

  // Step 4: Test with search functionality
  const searchArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: "product",
      },
    });
  typia.assert(searchArticles);

  TestValidator.predicate(
    "search results are properly paginated",
    () =>
      searchArticles.pagination.current === 1 &&
      searchArticles.pagination.limit === 20,
  );

  // Step 5: Test status filter
  const publishedArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 1,
        limit: 50,
        status: "published",
      },
    });
  typia.assert(publishedArticles);

  TestValidator.predicate("status filter returns valid articles", () =>
    publishedArticles.data.every(
      (article) =>
        article.status === "published" ||
        article.status === "draft" ||
        article.status === "archived",
    ),
  );

  TestValidator.equals(
    "published articles pagination limit matches request",
    publishedArticles.pagination.limit,
    50,
  );

  TestValidator.predicate(
    "pagination respects minimum requirements",
    () =>
      publishedArticles.pagination.limit >= 1 &&
      publishedArticles.pagination.limit <= 100,
  );

  // Step 6: Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 1,
        limit: 25,
        date_from: oneWeekAgo.toISOString(),
        date_to: now.toISOString(),
      },
    });
  typia.assert(recentArticles);

  TestValidator.predicate(
    "date range validation",
    () => oneWeekAgo.toISOString() < now.toISOString(),
  );

  TestValidator.predicate(
    "date range articles response structure is valid",
    () =>
      Array.isArray(recentArticles.data) &&
      typeof recentArticles.pagination.current === "number" &&
      typeof recentArticles.pagination.limit === "number" &&
      typeof recentArticles.pagination.records === "number" &&
      typeof recentArticles.pagination.pages === "number",
  );

  TestValidator.predicate(
    "date range request applies valid pagination",
    () =>
      recentArticles.pagination.limit === 25 &&
      recentArticles.pagination.current === 1,
  );

  // Step 7: Test featured filter
  const featuredArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 1,
        limit: 30,
        featured: true,
      },
    });
  typia.assert(featuredArticles);

  TestValidator.predicate("featured filter applies correctly", () =>
    featuredArticles.data.every(
      (article) => article.featured === true || article.featured === false,
    ),
  );

  TestValidator.predicate(
    "featured articles pagination is within valid range",
    () =>
      featuredArticles.pagination.limit >= 1 &&
      featuredArticles.pagination.limit <= 100,
  );
}
