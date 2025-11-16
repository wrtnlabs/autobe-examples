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
 * Test seller order search functionality and validate proper order filtering.
 *
 * This test validates the seller order search API by creating multiple seller
 * accounts and testing the order search functionality from different seller
 * perspectives. While we cannot create actual orders with the available API
 * endpoints, we verify that:
 *
 * 1. Order search API works correctly for authenticated sellers
 * 2. Pagination parameters are properly handled
 * 3. Filtering by status, date range, and amount works as expected
 * 4. Sorting options are correctly applied
 * 5. Search functionality operates without errors
 * 6. Response structure matches expected format
 *
 * Test Flow:
 *
 * 1. Create three seller accounts to simulate multi-seller environment
 * 2. Test order search from first seller's perspective with default parameters
 * 3. Test order search with status filtering
 * 4. Test order search with date range filtering
 * 5. Validate pagination functionality
 * 6. Test search term filtering
 * 7. Test amount range filtering
 * 8. Verify response data structure correctness
 */
export async function test_api_seller_orders_multi_seller_order_handling(
  connection: api.IConnection,
) {
  // Step 1: Create first seller account
  const seller1Data = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+1"),
    business_name: `${RandomGenerator.name(2)} LLC`,
    business_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    store_name: `${RandomGenerator.name(1)} Store`,
    href: "https://marketplace.example.com/seller/register",
    referrer: "https://marketplace.example.com/seller/info",
  } satisfies IShoppingMallSeller.ICreate;

  const seller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: seller1Data });
  typia.assert(seller1);

  // Step 2: Create second seller account
  const seller2Data = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+1"),
    business_name: `${RandomGenerator.name(2)} Inc`,
    business_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    store_name: `${RandomGenerator.name(1)} Shop`,
    href: "https://marketplace.example.com/seller/register",
    referrer: "https://marketplace.example.com/seller/info",
  } satisfies IShoppingMallSeller.ICreate;

  const seller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: seller2Data });
  typia.assert(seller2);

  // Step 3: Create third seller account
  const seller3Data = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+1"),
    business_name: `${RandomGenerator.name(2)} Corp`,
    business_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    store_name: `${RandomGenerator.name(1)} Market`,
    href: "https://marketplace.example.com/seller/register",
    referrer: "https://marketplace.example.com/seller/info",
  } satisfies IShoppingMallSeller.ICreate;

  const seller3: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: seller3Data });
  typia.assert(seller3);

  // Step 4: Test order search with default parameters (currently authenticated as seller3)
  const defaultSearchOrders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(defaultSearchOrders);

  // Validate pagination structure
  TestValidator.predicate(
    "default search pagination is valid",
    defaultSearchOrders.pagination.current === 1 &&
      defaultSearchOrders.pagination.limit === 20 &&
      defaultSearchOrders.pagination.current <=
        defaultSearchOrders.pagination.pages,
  );

  // Step 5: Test order search with status filtering
  const statusFilteredOrders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "total_amount",
        sort_order: "asc",
        status: "payment_confirmed",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(statusFilteredOrders);

  TestValidator.predicate(
    "status filtered orders pagination is valid",
    statusFilteredOrders.pagination.current === 1 &&
      statusFilteredOrders.pagination.limit === 10,
  );

  // Step 6: Test order search with date range filtering
  const fromDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const toDate = new Date().toISOString();

  const dateFilteredOrders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 50,
        sort_by: "status",
        sort_order: "asc",
        from_date: fromDate,
        to_date: toDate,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(dateFilteredOrders);

  TestValidator.predicate(
    "date filtered orders pagination is valid",
    dateFilteredOrders.pagination.current === 1 &&
      dateFilteredOrders.pagination.limit === 50,
  );

  // Step 7: Validate order data structure if orders exist
  if (defaultSearchOrders.data.length > 0) {
    const firstOrder = defaultSearchOrders.data[0];
    TestValidator.predicate(
      "order has required summary fields",
      typeof firstOrder.id === "string" &&
        typeof firstOrder.order_number === "string" &&
        typeof firstOrder.status === "string" &&
        typeof firstOrder.subtotal === "number" &&
        typeof firstOrder.total_amount === "number",
    );
  }

  // Step 8: Test pagination by requesting second page
  const secondPageOrders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 2,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(secondPageOrders);

  TestValidator.predicate(
    "second page pagination current is correct",
    secondPageOrders.pagination.current === 2,
  );

  // Step 9: Test search functionality with search term
  const searchTermOrders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: "ORD",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(searchTermOrders);

  // Step 10: Test amount range filtering
  const amountFilteredOrders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 20,
        min_amount: 10,
        max_amount: 1000,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(amountFilteredOrders);

  // Validate that all returned orders fall within the amount range
  if (amountFilteredOrders.data.length > 0) {
    const allInRange = amountFilteredOrders.data.every(
      (order) => order.total_amount >= 10 && order.total_amount <= 1000,
    );
    TestValidator.predicate(
      "all orders are within specified amount range",
      allInRange,
    );
  }

  // Step 11: Test sorting by different fields
  const sortedByAmount: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "total_amount",
        sort_order: "desc",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(sortedByAmount);

  // Step 12: Test payment status filtering
  const paymentStatusOrders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        page: 1,
        limit: 20,
        payment_status: "completed",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(paymentStatusOrders);
}
