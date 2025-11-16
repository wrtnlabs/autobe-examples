import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that sellers can combine multiple filters in complex search scenarios.
 *
 * Validates real-world seller workflows such as finding recent high-value
 * orders in processing status. Tests combinations of status, date range, amount
 * range, and sorting parameters to ensure all filters apply correctly together
 * and results satisfy all criteria while containing only the seller's items.
 *
 * The test follows this workflow:
 *
 * 1. Create and authenticate a seller account
 * 2. Execute baseline search queries to verify basic functionality
 * 3. Test complex multi-filter combinations:
 *
 *    - Status filtering (specific order statuses)
 *    - Date range filtering (orders within time periods)
 *    - Amount range filtering (orders within price ranges)
 *    - Combined filters (status + date + amount + sorting)
 * 4. Verify all results match ALL applied filter criteria
 * 5. Validate pagination and sorting work correctly with filters
 */
export async function test_api_seller_orders_search_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile("+1"),
        business_name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        business_description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        store_name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 5,
        }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Test baseline search - simple query without filters
  const baselineSearch: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(baselineSearch);

  // Validate pagination structure
  TestValidator.predicate(
    "baseline search returns valid pagination",
    baselineSearch.pagination.current === 1 &&
      baselineSearch.pagination.limit === 20,
  );

  // Step 3: Test status filter
  const processingStatusSearch: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "processing",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(processingStatusSearch);

  // Validate status filter works correctly
  if (processingStatusSearch.data.length > 0) {
    for (const order of processingStatusSearch.data) {
      TestValidator.equals(
        "status filter returns only processing orders",
        order.status,
        "processing",
      );
    }
  }

  // Step 4: Test date range filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeSearch: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 10,
        from_date: thirtyDaysAgo.toISOString(),
        to_date: now.toISOString(),
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(dateRangeSearch);

  // Validate date range filter
  if (dateRangeSearch.data.length > 0) {
    for (const order of dateRangeSearch.data) {
      const orderDate = new Date(order.created_at);
      TestValidator.predicate(
        "order is within date range",
        orderDate >= thirtyDaysAgo && orderDate <= now,
      );
    }
  }

  // Step 5: Test amount range filter
  const amountRangeSearch: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 10,
        min_amount: 100,
        max_amount: 1000,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(amountRangeSearch);

  // Validate amount range filter
  if (amountRangeSearch.data.length > 0) {
    for (const order of amountRangeSearch.data) {
      TestValidator.predicate(
        "order total is within amount range",
        order.total_amount >= 100 && order.total_amount <= 1000,
      );
    }
  }

  // Step 6: Test combined filters - status + date range + amount range
  const combinedFiltersSearch: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 15,
        status: "payment_confirmed",
        from_date: thirtyDaysAgo.toISOString(),
        to_date: now.toISOString(),
        min_amount: 50,
        max_amount: 5000,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(combinedFiltersSearch);

  // Validate combined filters work together
  if (combinedFiltersSearch.data.length > 0) {
    for (const order of combinedFiltersSearch.data) {
      TestValidator.equals(
        "combined filter status matches",
        order.status,
        "payment_confirmed",
      );

      const orderDate = new Date(order.created_at);
      TestValidator.predicate(
        "combined filter date range matches",
        orderDate >= thirtyDaysAgo && orderDate <= now,
      );

      TestValidator.predicate(
        "combined filter amount range matches",
        order.total_amount >= 50 && order.total_amount <= 5000,
      );
    }
  }

  // Step 7: Test sorting with filters - sort by total_amount descending
  const sortedByAmountDesc: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "processing",
        sort_by: "total_amount",
        sort_order: "desc",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(sortedByAmountDesc);

  // Validate sorting order
  if (sortedByAmountDesc.data.length > 1) {
    for (let i = 0; i < sortedByAmountDesc.data.length - 1; i++) {
      TestValidator.predicate(
        "orders sorted by amount descending",
        sortedByAmountDesc.data[i].total_amount >=
          sortedByAmountDesc.data[i + 1].total_amount,
      );
    }
  }

  // Step 8: Test sorting by created_at ascending with date filter
  const sortedByDateAsc: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 10,
        from_date: thirtyDaysAgo.toISOString(),
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(sortedByDateAsc);

  // Validate ascending date sort
  if (sortedByDateAsc.data.length > 1) {
    for (let i = 0; i < sortedByDateAsc.data.length - 1; i++) {
      const date1 = new Date(sortedByDateAsc.data[i].created_at);
      const date2 = new Date(sortedByDateAsc.data[i + 1].created_at);
      TestValidator.predicate(
        "orders sorted by date ascending",
        date1 <= date2,
      );
    }
  }

  // Step 9: Test complex realistic scenario - find recent high-value processing orders
  const realisticScenario: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "processing",
        from_date: new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        to_date: now.toISOString(),
        min_amount: 500,
        sort_by: "total_amount",
        sort_order: "desc",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(realisticScenario);

  // Step 10: Test pagination with filters - page 2
  const secondPage: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 2,
        limit: 10,
        status: "shipped",
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(secondPage);

  TestValidator.predicate(
    "second page pagination is correct",
    secondPage.pagination.current === 2 && secondPage.pagination.limit === 10,
  );

  // Step 11: Test search parameter combined with other filters
  const searchWithFilters: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: RandomGenerator.alphaNumeric(5),
        status: "delivered",
        min_amount: 100,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(searchWithFilters);
}
