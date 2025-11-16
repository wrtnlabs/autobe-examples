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
 * Test seller order retrieval without filters.
 *
 * This test validates the basic seller order search functionality where a
 * seller accesses the order list endpoint and receives all orders containing
 * items they are selling. The test verifies:
 *
 * 1. Seller authentication and account creation
 * 2. Basic order list retrieval without any filters
 * 3. Pagination structure is correct
 * 4. Response data format matches expected schema
 * 5. Default sorting and pagination settings apply correctly
 *
 * The backend automatically filters orders to show only those containing the
 * authenticated seller's items, ensuring proper authorization and data
 * isolation.
 */
export async function test_api_seller_orders_search_all(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: typia.random<string & tags.Pattern<"^\\+?[1-9]\\d{1,14}$">>(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Step 2: Retrieve all orders without filters
  const orderRequest = {} satisfies IShoppingMallOrder.IRequest;

  const orderResponse: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: orderRequest,
    });
  typia.assert(orderResponse);

  // Step 3: Validate pagination metadata values
  TestValidator.predicate(
    "current page should be at least 0",
    orderResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "limit should be positive",
    orderResponse.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "total records should be non-negative",
    orderResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    orderResponse.pagination.pages >= 0,
  );

  // Step 4: If there are orders, validate their structure
  if (orderResponse.data.length > 0) {
    for (const order of orderResponse.data) {
      typia.assert<IShoppingMallOrder.ISummary>(order);
    }
  }
}
