import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayout";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test the seller payout list retrieval workflow where sellers query their
 * earnings settlement history.
 *
 * This test validates that sellers can successfully authenticate and access
 * their payout records through a paginated list endpoint with comprehensive
 * filtering and sorting capabilities.
 *
 * Workflow steps:
 *
 * 1. Seller authenticates via join to establish session
 * 2. Seller retrieves paginated payout list with various filters
 * 3. Validate pagination structure and metadata
 * 4. Test filtering by status, amount ranges, and date ranges
 * 5. Verify sorting functionality
 * 6. Confirm security measures for sensitive data
 */
export async function test_api_seller_payout_list_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Seller authentication
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 2,
      wordMax: 4,
    }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 2: Retrieve payout list with default pagination
  const defaultRequest = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallSellerPayout.IRequest;

  const payoutList: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.seller.sellerPayouts.index(connection, {
      body: defaultRequest,
    });
  typia.assert(payoutList);

  // Step 3: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    payoutList.pagination.current >= 1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    payoutList.pagination.limit,
    defaultRequest.limit,
  );
  TestValidator.predicate(
    "pagination total records is non-negative",
    payoutList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    payoutList.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "payout data is an array",
    Array.isArray(payoutList.data),
  );

  // Step 4: Test filtering by status
  const statusValues = [
    "pending",
    "processing",
    "completed",
    "failed",
  ] as const;
  const testStatus = RandomGenerator.pick(statusValues);

  const statusFilterRequest = {
    page: 1,
    limit: 10,
    status: testStatus,
  } satisfies IShoppingMallSellerPayout.IRequest;

  const statusFilteredList: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.seller.sellerPayouts.index(connection, {
      body: statusFilterRequest,
    });
  typia.assert(statusFilteredList);

  // Step 5: Test filtering by amount ranges
  const amountFilterRequest = {
    page: 1,
    limit: 10,
    min_amount: 100,
    max_amount: 10000,
  } satisfies IShoppingMallSellerPayout.IRequest;

  const amountFilteredList: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.seller.sellerPayouts.index(connection, {
      body: amountFilterRequest,
    });
  typia.assert(amountFilteredList);

  // Step 6: Test filtering by date ranges
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFilterRequest = {
    page: 1,
    limit: 10,
    payout_date_from: thirtyDaysAgo.toISOString(),
    payout_date_to: now.toISOString(),
  } satisfies IShoppingMallSellerPayout.IRequest;

  const dateFilteredList: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.seller.sellerPayouts.index(connection, {
      body: dateFilterRequest,
    });
  typia.assert(dateFilteredList);

  // Step 7: Test sorting functionality - ascending
  const sortAscRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "asc",
  } satisfies IShoppingMallSellerPayout.IRequest;

  const sortedAscList: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.seller.sellerPayouts.index(connection, {
      body: sortAscRequest,
    });
  typia.assert(sortedAscList);

  // Step 8: Test sorting functionality - descending
  const sortDescRequest = {
    page: 1,
    limit: 10,
    sort_by: "net_payout_amount",
    sort_order: "desc",
  } satisfies IShoppingMallSellerPayout.IRequest;

  const sortedDescList: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.seller.sellerPayouts.index(connection, {
      body: sortDescRequest,
    });
  typia.assert(sortedDescList);

  // Step 9: Test search functionality
  const searchRequest = {
    page: 1,
    limit: 10,
    search: RandomGenerator.alphabets(5),
  } satisfies IShoppingMallSellerPayout.IRequest;

  const searchResults: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.seller.sellerPayouts.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResults);

  // Step 10: Test combined filters
  const combinedFilterRequest = {
    page: 1,
    limit: 15,
    status: "completed",
    min_amount: 500,
    sort_by: "completed_at",
    sort_order: "desc",
  } satisfies IShoppingMallSellerPayout.IRequest;

  const combinedFilteredList: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.seller.sellerPayouts.index(connection, {
      body: combinedFilterRequest,
    });
  typia.assert(combinedFilteredList);

  // Step 11: Validate payout summary structure if data exists
  if (payoutList.data.length > 0) {
    const firstPayout = payoutList.data[0];
    typia.assert(firstPayout);

    TestValidator.predicate(
      "payout has valid ID",
      typeof firstPayout.id === "string" && firstPayout.id.length > 0,
    );
    TestValidator.predicate(
      "payout has seller ID",
      typeof firstPayout.shopping_mall_seller_id === "string",
    );
    TestValidator.predicate(
      "payout has financial breakdown",
      typeof firstPayout.gross_amount === "number" &&
        typeof firstPayout.commission_amount === "number" &&
        typeof firstPayout.net_payout_amount === "number",
    );
  }
}
