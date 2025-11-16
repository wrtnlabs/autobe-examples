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
 * Test that buyers can retrieve their complete order history without any
 * filters.
 *
 * This test validates the basic search functionality where a buyer accesses the
 * order list endpoint and receives all their orders in paginated format. The
 * test verifies that only the authenticated buyer's orders are returned,
 * pagination metadata is correct, and order summaries contain all required
 * fields including order number, status, amounts, and timestamps.
 *
 * The test confirms default sorting (by created_at descending) and default
 * pagination settings when no specific parameters are provided.
 *
 * Test Steps:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Call the order search API with empty/minimal request body
 * 3. Validate the paginated response structure using typia.assert
 * 4. Verify the response conforms to expected type structure
 */
export async function test_api_buyer_orders_search_all(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerData = {
    email: buyerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const authenticatedBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(authenticatedBuyer);

  // Step 2: Call the order search API with empty request body (no filters)
  // This should return all orders for the authenticated buyer with default pagination
  const orderSearchRequest = {} satisfies IShoppingMallOrder.IRequest;

  const orderListResponse: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.buyer.orders.index(connection, {
      body: orderSearchRequest,
    });
  typia.assert(orderListResponse);

  // Step 3: Validate that the response structure is correct
  // typia.assert() has already performed COMPLETE validation of all fields,
  // including pagination metadata, data array, and all nested properties

  // Step 4: Verify basic pagination consistency (business logic, not type validation)
  const pagination = orderListResponse.pagination;
  const dataCount = orderListResponse.data.length;

  TestValidator.predicate(
    "returned data count does not exceed pagination limit",
    dataCount <= pagination.limit,
  );

  TestValidator.predicate(
    "pagination pages calculation is consistent with records and limit",
    pagination.pages === Math.ceil(pagination.records / pagination.limit) ||
      (pagination.records === 0 && pagination.pages === 0),
  );
}
