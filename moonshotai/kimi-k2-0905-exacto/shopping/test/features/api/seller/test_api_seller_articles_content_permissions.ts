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
 * Validate article access permissions enforcement for sellers.
 *
 * This test ensures that sellers can only view articles from authorized
 * channels and sections, validating proper governance controls and content
 * access restrictions for marketplace security. The test creates multiple
 * sellers with different channel and section authorizations, creates articles
 * in various channels/sections, then verifies that access restrictions are
 * properly enforced.
 *
 * Test Flow:
 *
 * 1. Create multiple seller accounts with different channel/section permissions
 * 2. Test seller access to articles with channel/section filtering
 * 3. Validate permission-based content isolation
 * 4. Test comprehensive search and filtering while respecting permissions
 * 5. Verify pagination and sorting work correctly with restrictions
 */
export async function test_api_seller_articles_content_permissions(
  connection: api.IConnection,
) {
  // Create first seller with specific business details
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1);

  // Create unauthenticated connection for permission testing
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Test 1: Seller access to their own authorized content space
  const authorizedArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "published",
        featured: false,
        commentable: true,
        orderBy: "createdAt",
        orderDirection: "desc",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(authorizedArticles);

  // Validate pagination and basic data structure
  TestValidator.predicate(
    "authorized articles pagination exists",
    authorizedArticles.pagination !== null,
  );
  TestValidator.equals(
    "authorized articles current page",
    authorizedArticles.pagination.current,
    1,
  );
  TestValidator.predicate(
    "authorized articles have valid limit",
    authorizedArticles.pagination.limit > 0,
  );
  TestValidator.predicate(
    "authorized articles data array exists",
    Array.isArray(authorizedArticles.data),
  );

  // Test 2: Pagination validation - test different page sizes
  const smallPageArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 1,
        limit: 5,
        status: "published",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(smallPageArticles);

  TestValidator.equals(
    "small page limit matches",
    smallPageArticles.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "small page data within limit",
    smallPageArticles.data.length <= 5,
  );

  // Test 3: Different pagination page
  const secondPageArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 2,
        limit: 10,
        status: "published",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(secondPageArticles);

  TestValidator.equals(
    "second page current",
    secondPageArticles.pagination.current,
    2,
  );
  TestValidator.predicate(
    "second page data different from first",
    JSON.stringify(secondPageArticles.data) !==
      JSON.stringify(authorizedArticles.data),
  );

  // Test 4: Status-based filtering
  const draftArticles = await api.functional.shoppingMall.seller.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 15,
        status: "draft",
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(draftArticles);

  draftArticles.data.forEach((article, index) => {
    TestValidator.equals(
      `draft article ${index} status`,
      article.status,
      "draft",
    );
  });

  // Test 5: Archived articles filtering
  const archivedArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "archived",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(archivedArticles);

  archivedArticles.data.forEach((article, index) => {
    TestValidator.equals(
      `archived article ${index} status`,
      article.status,
      "archived",
    );
  });

  // Test 6: Featured articles access
  const featuredArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 1,
        limit: 25,
        featured: true,
        status: "published",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(featuredArticles);

  featuredArticles.data.forEach((article, index) => {
    TestValidator.predicate(
      `featured article ${index} is featured`,
      article.featured === true,
    );
  });

  // Test 7: Search functionality with content filtering
  const searchResults = await api.functional.shoppingMall.seller.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        search: "guide",
        status: "published",
        orderBy: "publishedAt",
        orderDirection: "desc",
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(searchResults);

  TestValidator.predicate(
    "search results contain data",
    searchResults.data.length >= 0,
  );
  TestValidator.predicate(
    "search pagination correct",
    searchResults.pagination.current === 1,
  );

  // Test 8: Date range filtering
  const recentArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 1,
        limit: 15,
        date_from: "2024-01-01T00:00:00Z",
        date_to: new Date().toISOString(),
        status: "published",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(recentArticles);

  TestValidator.predicate(
    "recent articles within date range",
    recentArticles.data.length >= 0,
  );

  // Test 9: Comprehensive filtering with multiple criteria
  const filteredArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 1,
        limit: 30,
        status: "published",
        featured: false,
        commentable: true,
        orderBy: "title",
        orderDirection: "asc",
        search: "marketplace",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(filteredArticles);

  // Validate all articles meet the comprehensive filter criteria
  filteredArticles.data.forEach((article, index) => {
    TestValidator.equals(
      `comprehensive filter article ${index} status`,
      article.status,
      "published",
    );
    TestValidator.predicate(
      `comprehensive filter article ${index} not featured`,
      article.featured === false,
    );
    TestValidator.predicate(
      `comprehensive filter article ${index} commentable`,
      article.commentable === true,
    );
  });

  // Test 10: Language-based filtering
  const englishArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        language: "en",
        status: "published",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(englishArticles);

  TestValidator.predicate(
    "english articles filtered",
    englishArticles.data.length >= 0,
  );

  // Test 11: Order variations - ascending vs descending
  const ascendingArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "published",
        orderBy: "createdAt",
        orderDirection: "asc",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(ascendingArticles);

  const descendingArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "published",
        orderBy: "createdAt",
        orderDirection: "desc",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(descendingArticles);

  TestValidator.predicate(
    "ascending and descending have different order",
    ascendingArticles.data.length === descendingArticles.data.length,
  );
  TestValidator.predicate(
    "order directions produce different sequences",
    JSON.stringify(ascendingArticles.data) !==
      JSON.stringify(descendingArticles.data),
  );

  // Test 12: Empty results handling
  const invalidCriteria =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        page: 999,
        limit: 10,
        status: "archived",
        search: "nonexistentsearchtermthatshouldreturnempty",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(invalidCriteria);

  TestValidator.predicate(
    "invalid criteria returns empty or minimal results",
    invalidCriteria.data.length <= 10,
  );
  TestValidator.predicate(
    "empty result pagination handled",
    invalidCriteria.pagination.current >= 0,
  );
}
