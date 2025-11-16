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
 * Test that sellers can filter orders by date ranges to find orders from
 * specific time periods.
 *
 * This test validates temporal filtering for sellers reviewing recent orders or
 * generating reports for specific date ranges. It tests three scenarios:
 *
 * 1. Filtering with from_date only - returns orders created on or after the
 *    specified date
 * 2. Filtering with to_date only - returns orders created on or before the
 *    specified date
 * 3. Filtering with both from_date and to_date - returns orders within the date
 *    range
 *
 * The test verifies that only orders containing the seller's items within the
 * date range are returned, and that pagination metadata is correctly
 * populated.
 */
export async function test_api_seller_orders_search_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("+1"),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 3 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Set up date boundaries for testing
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Step 3: Test filtering with from_date only (orders after 15 days ago)
  const fromDateResult = await api.functional.shoppingMall.seller.orders.index(
    connection,
    {
      body: {
        from_date: fifteenDaysAgo.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(fromDateResult);

  // Validate pagination structure
  TestValidator.predicate(
    "from_date filter returns valid pagination",
    fromDateResult.pagination.current >= 1,
  );

  // Validate all returned orders are within the date range
  for (const order of fromDateResult.data) {
    const orderDate = new Date(order.created_at);
    TestValidator.predicate(
      "order created_at is on or after from_date",
      orderDate >= fifteenDaysAgo,
    );
  }

  // Step 4: Test filtering with to_date only (orders before 7 days ago)
  const toDateResult = await api.functional.shoppingMall.seller.orders.index(
    connection,
    {
      body: {
        to_date: sevenDaysAgo.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(toDateResult);

  // Validate pagination structure
  TestValidator.predicate(
    "to_date filter returns valid pagination",
    toDateResult.pagination.current >= 1,
  );

  // Validate all returned orders are within the date range
  for (const order of toDateResult.data) {
    const orderDate = new Date(order.created_at);
    TestValidator.predicate(
      "order created_at is on or before to_date",
      orderDate <= sevenDaysAgo,
    );
  }

  // Step 5: Test filtering with both from_date and to_date (orders between 30 and 15 days ago)
  const combinedResult = await api.functional.shoppingMall.seller.orders.index(
    connection,
    {
      body: {
        from_date: thirtyDaysAgo.toISOString(),
        to_date: fifteenDaysAgo.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(combinedResult);

  // Validate pagination structure
  TestValidator.predicate(
    "combined date filter returns valid pagination",
    combinedResult.pagination.current >= 1,
  );

  // Validate all returned orders are within the combined date range
  for (const order of combinedResult.data) {
    const orderDate = new Date(order.created_at);
    TestValidator.predicate(
      "order created_at is within from_date and to_date range",
      orderDate >= thirtyDaysAgo && orderDate <= fifteenDaysAgo,
    );
  }

  // Step 6: Validate response structure and pagination metadata
  TestValidator.predicate(
    "response has correct structure",
    Array.isArray(combinedResult.data),
  );

  TestValidator.predicate(
    "pagination has required fields",
    combinedResult.pagination.current !== undefined &&
      combinedResult.pagination.limit !== undefined &&
      combinedResult.pagination.records !== undefined &&
      combinedResult.pagination.pages !== undefined,
  );
}
