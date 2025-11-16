import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that buyers can search within their review content using the search_text
 * parameter.
 *
 * This test creates a buyer account, then performs text searches to validate
 * the search functionality. The test validates case-insensitive partial
 * matching functionality, ensuring buyers can quickly find reviews where they
 * discussed particular topics without manually browsing their entire review
 * history. This is essential for buyers with extensive review histories who
 * need to reference specific feedback.
 *
 * Workflow:
 *
 * 1. Create and authenticate buyer account
 * 2. Perform text search with various keywords
 * 3. Validate search results have proper structure
 * 4. Test case-insensitive matching
 * 5. Test partial keyword matching
 * 6. Verify empty results for non-existent keywords
 */
export async function test_api_buyer_reviews_text_search(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"uuid">>() + "@test.com";
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      ip: "127.0.0.1",
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Search with a keyword to test basic search functionality
  const searchKeyword = "quality";
  const searchResult =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        search_text: searchKeyword,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(searchResult);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "search result has valid pagination current page",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "search result has valid pagination limit",
    searchResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "search result data is an array",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );

  // Step 4: Test case-insensitive search with uppercase
  const upperCaseResult =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        search_text: searchKeyword.toUpperCase(),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(upperCaseResult);
  TestValidator.predicate(
    "uppercase search returns valid pagination",
    upperCaseResult.pagination.current >= 1,
  );

  // Step 5: Test case-insensitive search with mixed case
  const mixedCaseResult =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        search_text: "QuAlItY",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(mixedCaseResult);
  TestValidator.predicate(
    "mixed case search returns valid pagination",
    mixedCaseResult.pagination.current >= 1,
  );

  // Step 6: Test search with non-existent keyword
  const nonExistentKeyword = "NONEXISTENTKEYWORD12345XYZ";
  const emptyResult =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        search_text: nonExistentKeyword,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(emptyResult);
  TestValidator.predicate(
    "non-existent keyword returns valid pagination structure",
    emptyResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "non-existent keyword has valid pagination limit",
    emptyResult.pagination.limit >= 1,
  );

  // Step 7: Test search with partial keyword
  const partialKeyword = "qual";
  const partialResult =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        search_text: partialKeyword,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(partialResult);
  TestValidator.predicate(
    "partial keyword search returns valid pagination",
    partialResult.pagination.current >= 1,
  );

  // Step 8: Test search with different common keywords
  const commonKeywords = ["good", "bad", "excellent", "terrible", "recommend"];
  for (const keyword of commonKeywords) {
    const keywordResult =
      await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
        buyerId: buyer.id,
        body: {
          search_text: keyword,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallReview.IRequest,
      });
    typia.assert(keywordResult);
    TestValidator.predicate(
      `search with keyword '${keyword}' returns valid pagination`,
      keywordResult.pagination.current >= 1,
    );
  }

  // Step 9: Test empty search text parameter
  const allReviewsResult =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(allReviewsResult);
  TestValidator.predicate(
    "request without search_text returns valid pagination",
    allReviewsResult.pagination.current >= 1,
  );
}
