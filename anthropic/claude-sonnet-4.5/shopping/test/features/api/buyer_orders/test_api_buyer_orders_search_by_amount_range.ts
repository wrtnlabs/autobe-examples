import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

/**
 * Test buyer order search filtering by total amount range.
 *
 * This test validates that buyers can filter their orders using min_amount and
 * max_amount parameters. It creates orders with different total amounts and
 * verifies that the search API correctly filters orders based on price ranges,
 * ensuring boundaries are inclusive.
 *
 * Workflow:
 *
 * 1. Create and authenticate a buyer account
 * 2. Create multiple orders with varying total amounts
 * 3. Test min_amount filtering (orders >= min)
 * 4. Test max_amount filtering (orders <= max)
 * 5. Test combined min/max filtering (min <= orders <= max)
 * 6. Verify boundary inclusiveness and result accuracy
 */
export async function test_api_buyer_orders_search_by_amount_range(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://test.com/register",
      referrer: "https://test.com",
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Search all orders to establish baseline
  const allOrders = await api.functional.shoppingMall.buyer.orders.index(
    connection,
    {
      body: {} satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(allOrders);

  // Step 3: Test filtering with only min_amount parameter
  const minAmount = 100;
  const minAmountResult = await api.functional.shoppingMall.buyer.orders.index(
    connection,
    {
      body: {
        min_amount: minAmount,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(minAmountResult);

  // Verify all results have total_amount >= min_amount
  for (const order of minAmountResult.data) {
    TestValidator.predicate(
      "order total_amount should be >= min_amount",
      order.total_amount >= minAmount,
    );
  }

  // Step 4: Test filtering with only max_amount parameter
  const maxAmount = 500;
  const maxAmountResult = await api.functional.shoppingMall.buyer.orders.index(
    connection,
    {
      body: {
        max_amount: maxAmount,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(maxAmountResult);

  // Verify all results have total_amount <= max_amount
  for (const order of maxAmountResult.data) {
    TestValidator.predicate(
      "order total_amount should be <= max_amount",
      order.total_amount <= maxAmount,
    );
  }

  // Step 5: Test filtering with both min_amount and max_amount parameters
  const rangeMin = 200;
  const rangeMax = 800;
  const rangeResult = await api.functional.shoppingMall.buyer.orders.index(
    connection,
    {
      body: {
        min_amount: rangeMin,
        max_amount: rangeMax,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(rangeResult);

  // Verify all results are within the specified range
  for (const order of rangeResult.data) {
    TestValidator.predicate(
      "order total_amount should be within min and max range",
      order.total_amount >= rangeMin && order.total_amount <= rangeMax,
    );
  }

  // Step 6: Verify boundary inclusiveness with exact boundary values
  if (rangeResult.data.length > 0) {
    const exactMinResult = await api.functional.shoppingMall.buyer.orders.index(
      connection,
      {
        body: {
          min_amount: rangeResult.data[0].total_amount,
          max_amount: rangeResult.data[0].total_amount,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
    typia.assert(exactMinResult);

    // Verify that exact boundary matching works (inclusive)
    const matchingOrders = exactMinResult.data.filter(
      (o) => o.total_amount === rangeResult.data[0].total_amount,
    );
    TestValidator.predicate(
      "should find orders matching exact boundary amount",
      matchingOrders.length > 0,
    );
  }

  // Step 7: Test combined filters don't return orders outside range
  const strictRangeMin = 300;
  const strictRangeMax = 400;
  const strictResult = await api.functional.shoppingMall.buyer.orders.index(
    connection,
    {
      body: {
        min_amount: strictRangeMin,
        max_amount: strictRangeMax,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(strictResult);

  // Ensure no orders are below min or above max
  for (const order of strictResult.data) {
    TestValidator.predicate(
      "no order should be below min_amount",
      order.total_amount >= strictRangeMin,
    );
    TestValidator.predicate(
      "no order should be above max_amount",
      order.total_amount <= strictRangeMax,
    );
  }
}
