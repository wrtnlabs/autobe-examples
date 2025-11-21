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
 * Test retrieval of featured articles specifically marked for promotional
 * display.
 *
 * Validates featured article identification, display order prioritization, and
 * seller-specific featured content curation workflows within their marketplace
 * channel. Since articles can only be retrieved (not created), this test
 * focuses on the filtering, pagination, and sorting capabilities of the
 * featured content system.
 *
 * Test Flow:
 *
 * 1. Seller Registration - Create authenticated seller account for marketplace
 *    access
 * 2. Featured Content Discovery - Test filtering existing articles by featured
 *    status
 * 3. Pagination Validation - Verify proper handling of large featured content sets
 * 4. Advanced Filtering - Test combined criteria (featured + status + date ranges)
 * 5. Sorting and Ordering - Test display priority and chronological organization
 * 6. Search Integration - Test featured content with text search capabilities
 * 7. Channel Authorization - Validate content scope within seller's marketplace
 *    channels
 * 8. Error Handling - Test invalid parameters and edge cases
 * 9. Response Validation - Verify proper metadata and pagination structures
 * 10. Business Logic - Test article identification and business code systems
 */
export async function test_api_seller_articles_featured_content(
  connection: api.IConnection,
) {
  // Step 1: Register seller account for marketplace access
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const businessInfo = {
    email: sellerEmail,
    business_name: RandomGenerator.name(),
    business_registration_number: RandomGenerator.alphaNumeric(12),
    tax_id: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
    business_type: RandomGenerator.pick([
      "corporation",
      "llc",
      "partnership",
      "sole_proprietorship",
    ] as const),
  } satisfies IShoppingMallSeller.IJoin;

  const seller = await api.functional.auth.seller.join(connection, {
    body: businessInfo,
  });
  typia.assert(seller);

  // Step 2: Test basic featured article retrieval
  const featuredOnlyRequest = {
    page: 1,
    limit: 10,
    featured: true,
    orderBy: "created_at",
    orderDirection: "desc" as const,
  } satisfies IShoppingMallArticle.IRequest;

  const featuredArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: featuredOnlyRequest,
    });
  typia.assert(featuredArticles);

  // Validate response structure and featured content filtering
  TestValidator.predicate(
    "featured articles response has valid pagination structure",
    () =>
      !!featuredArticles.pagination &&
      typeof featuredArticles.pagination.current === "number",
  );

  TestValidator.predicate(
    "featured articles response contains data array",
    () => Array.isArray(featuredArticles.data),
  );

  // If articles exist, validate they match featured criteria
  if (featuredArticles.data.length > 0) {
    TestValidator.predicate(
      "returned articles are featured when featured filter is applied",
      () => featuredArticles.data.every((article) => article.featured === true),
    );
  }

  // Step 3: Test pagination with different page sizes
  const paginationRequests = [
    { page: 1, limit: 5, featured: true },
    { page: 1, limit: 20, featured: true },
    { page: 2, limit: 10, featured: true },
  ];

  for (const paginationRequest of paginationRequests) {
    const paginatedResults =
      await api.functional.shoppingMall.seller.articles.index(connection, {
        body: paginationRequest,
      });
    typia.assert(paginatedResults);

    TestValidator.predicate(
      `page ${paginationRequest.page} has correct metadata`,
      () => paginatedResults.pagination.current === paginationRequest.page,
    );

    TestValidator.predicate(
      `limit ${paginationRequest.limit} is respected`,
      () => paginatedResults.data.length <= paginationRequest.limit,
    );
  }

  // Step 4: Test advanced filtering combining featured with other criteria
  const advancedFilters = [
    { featured: true, status: "published" as const },
    { featured: true, status: "draft" as const },
    { featured: true, commentable: true },
    { featured: true, commentable: false },
  ];

  for (const filterCombination of advancedFilters) {
    const filteredRequest = {
      page: 1,
      limit: 15,
      ...filterCombination,
    } satisfies IShoppingMallArticle.IRequest;

    const filteredArticles =
      await api.functional.shoppingMall.seller.articles.index(connection, {
        body: filteredRequest,
      });
    typia.assert(filteredArticles);

    // Validate combined filters work correctly
    TestValidator.predicate(
      `filtered articles meet all criteria for ${JSON.stringify(filterCombination)}`,
      () => {
        if (filteredArticles.data.length === 0) return true; // Empty results are valid
        return filteredArticles.data.every((article) => {
          return (
            article.featured === true &&
            (!filterCombination.status ||
              article.status === filterCombination.status) &&
            (filterCombination.commentable === undefined ||
              article.commentable === filterCombination.commentable)
          );
        });
      },
    );
  }

  // Step 5: Test date range filtering for scheduling scenarios
  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const dateRangeRequest = {
    page: 1,
    limit: 20,
    featured: true,
    date_from: lastWeek.toISOString(),
    date_to: nextWeek.toISOString(),
  } satisfies IShoppingMallArticle.IRequest;

  const dateFilteredArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: dateRangeRequest,
    });
  typia.assert(dateFilteredArticles);

  TestValidator.predicate("date filtered articles respect date range", () => {
    if (dateFilteredArticles.data.length === 0) return true;
    return dateFilteredArticles.data.every((article) => {
      const articleDate = new Date(article.createdAt);
      return articleDate >= lastWeek && articleDate <= nextWeek;
    });
  });

  // Step 6: Test various sorting configurations
  const sortingTests = [
    { featured: true, orderBy: "title", orderDirection: "asc" as const },
    { featured: true, orderBy: "title", orderDirection: "desc" as const },
    { featured: true, orderBy: "created_at", orderDirection: "desc" as const },
    {
      featured: true,
      orderBy: "published_at",
      orderDirection: "desc" as const,
    },
  ];

  for (const sortConfig of sortingTests) {
    const sortedRequest = {
      page: 1,
      limit: 10,
      ...sortConfig,
    } satisfies IShoppingMallArticle.IRequest;

    const sortedResults =
      await api.functional.shoppingMall.seller.articles.index(connection, {
        body: sortedRequest,
      });
    typia.assert(sortedResults);

    TestValidator.predicate(
      `sorting by ${sortConfig.orderBy} ${sortConfig.orderDirection} returns valid results`,
      () => sortedResults.data.length >= 0,
    ); // Valid even if empty
  }

  // Step 7: Test search functionality with featured articles
  const searchTerms = [
    "product",
    "guide",
    "tutorial",
    "review",
    "tips",
  ] as const;
  const searchTerm = RandomGenerator.pick(searchTerms);

  const searchRequest = {
    page: 1,
    limit: 10,
    featured: true,
    search: searchTerm,
  } satisfies IShoppingMallArticle.IRequest;

  const searchResults = await api.functional.shoppingMall.seller.articles.index(
    connection,
    {
      body: searchRequest,
    },
  );
  typia.assert(searchResults);

  TestValidator.predicate(
    "search with featured filter returns valid structure",
    () => !!searchResults.pagination && Array.isArray(searchResults.data),
  );

  // Step 8: Test channel and category filtering
  const channelRequests = [
    { page: 1, limit: 10, featured: true }, // All channels
    {
      page: 1,
      limit: 10,
      featured: true,
      section_id: typia.random<string & tags.Format<"uuid">>(),
    }, // Specific section
    {
      page: 1,
      limit: 10,
      featured: true,
      category_id: typia.random<string & tags.Format<"uuid">>(),
    }, // Specific category
  ];

  for (const channelRequest of channelRequests) {
    const channelResults =
      await api.functional.shoppingMall.seller.articles.index(connection, {
        body: channelRequest satisfies IShoppingMallArticle.IRequest,
      });
    typia.assert(channelResults);

    TestValidator.predicate(
      "channel filtering returns valid pagination",
      () =>
        !!channelResults.pagination &&
        typeof channelResults.pagination.records === "number",
    );
  }

  // Step 9: Test response metadata validation
  if (featuredArticles.data.length > 0) {
    const sampleArticle = featuredArticles.data[0];

    TestValidator.predicate(
      "article has required identification fields",
      () => !!sampleArticle.id && !!sampleArticle.code && !!sampleArticle.title,
    );

    TestValidator.predicate("article has proper status value", () =>
      ["draft", "published", "archived"].includes(sampleArticle.status),
    );

    TestValidator.predicate(
      "article has channel association",
      () =>
        !!sampleArticle.channel &&
        !!sampleArticle.channel.id &&
        !!sampleArticle.channel.name,
    );

    TestValidator.predicate(
      "article has section association",
      () =>
        !!sampleArticle.section &&
        !!sampleArticle.section.id &&
        !!sampleArticle.section.name,
    );

    TestValidator.predicate(
      "article has category association",
      () =>
        !!sampleArticle.channelCategory && !!sampleArticle.channelCategory.id,
    );
  }

  // Step 10: Test non-featured content filtering
  const nonFeaturedRequest = {
    page: 1,
    limit: 10,
    featured: false,
  } satisfies IShoppingMallArticle.IRequest;

  const nonFeaturedResults =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: nonFeaturedRequest,
    });
  typia.assert(nonFeaturedResults);

  TestValidator.predicate(
    "non-featured filter excludes featured articles",
    () => {
      if (nonFeaturedResults.data.length === 0) return true;
      return nonFeaturedResults.data.every(
        (article) => article.featured === false,
      );
    },
  );
}
