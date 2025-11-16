import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test seller session search with filters that produce empty results.
 *
 * Validates that the session search API handles empty result sets gracefully
 * with correct pagination metadata. This test ensures the API returns proper
 * HTTP 200 responses with empty data arrays and accurate pagination information
 * when filters match no sessions.
 *
 * Test workflow:
 *
 * 1. Create a new seller account and establish initial authentication session
 * 2. Query sessions with filters guaranteed to return no results:
 *
 *    - Non-existent IP address filter
 *    - Date range before account creation
 *    - Random text search in session fields
 * 3. Validate empty result handling:
 *
 *    - HTTP 200 success response
 *    - Empty data array
 *    - Correct pagination metadata (0 records, 0 pages)
 *    - Valid response schema structure
 *    - Consistent behavior across filter types
 */
export async function test_api_seller_sessions_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create seller account and establish initial session
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 2,
      wordMax: 5,
    }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Step 2: Test empty results with non-existent IP address filter
  const nonExistentIp = "192.0.2.255";
  const emptyResultByIp: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 10,
          ip: nonExistentIp,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(emptyResultByIp);

  // Validate empty result structure
  TestValidator.equals(
    "empty data array for non-existent IP",
    emptyResultByIp.data.length,
    0,
  );
  TestValidator.equals(
    "zero records count for non-existent IP",
    emptyResultByIp.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages count for non-existent IP",
    emptyResultByIp.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1 for non-existent IP",
    emptyResultByIp.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit preserved for non-existent IP",
    emptyResultByIp.pagination.limit,
    10,
  );

  // Step 3: Test empty results with date range before account creation
  const beforeCreation = new Date(
    new Date(seller.created_at).getTime() - 86400000 * 30,
  ).toISOString();
  const wayBeforeCreation = new Date(
    new Date(seller.created_at).getTime() - 86400000 * 60,
  ).toISOString();

  const emptyResultByDate: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
          created_at_after: wayBeforeCreation,
          created_at_before: beforeCreation,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(emptyResultByDate);

  TestValidator.equals(
    "empty data array for date range filter",
    emptyResultByDate.data.length,
    0,
  );
  TestValidator.equals(
    "zero records count for date range filter",
    emptyResultByDate.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages count for date range filter",
    emptyResultByDate.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1 for date range filter",
    emptyResultByDate.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit preserved for date range filter",
    emptyResultByDate.pagination.limit,
    20,
  );

  // Step 4: Test empty results with random search text
  const randomSearchText = RandomGenerator.alphaNumeric(32);

  const emptyResultBySearch: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 15,
          search: randomSearchText,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(emptyResultBySearch);

  TestValidator.equals(
    "empty data array for random search",
    emptyResultBySearch.data.length,
    0,
  );
  TestValidator.equals(
    "zero records count for random search",
    emptyResultBySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages count for random search",
    emptyResultBySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1 for random search",
    emptyResultBySearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit preserved for random search",
    emptyResultBySearch.pagination.limit,
    15,
  );

  // Step 5: Test empty results with non-existent referrer URL
  const nonExistentReferrer =
    "https://non-existent-domain-12345.example.com/path";

  const emptyResultByReferrer: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 25,
          referrer: nonExistentReferrer,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(emptyResultByReferrer);

  TestValidator.equals(
    "empty data array for referrer filter",
    emptyResultByReferrer.data.length,
    0,
  );
  TestValidator.equals(
    "zero records count for referrer filter",
    emptyResultByReferrer.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages count for referrer filter",
    emptyResultByReferrer.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1 for referrer filter",
    emptyResultByReferrer.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit preserved for referrer filter",
    emptyResultByReferrer.pagination.limit,
    25,
  );

  // Step 6: Test empty results with combined filters
  const emptyResultCombined: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 30,
          ip: nonExistentIp,
          search: randomSearchText,
          created_at_before: beforeCreation,
          sort: ["+created_at"],
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(emptyResultCombined);

  TestValidator.equals(
    "empty data array for combined filters",
    emptyResultCombined.data.length,
    0,
  );
  TestValidator.equals(
    "zero records count for combined filters",
    emptyResultCombined.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages count for combined filters",
    emptyResultCombined.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1 for combined filters",
    emptyResultCombined.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit preserved for combined filters",
    emptyResultCombined.pagination.limit,
    30,
  );
}
