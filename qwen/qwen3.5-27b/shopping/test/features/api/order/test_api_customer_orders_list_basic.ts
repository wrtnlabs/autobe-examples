import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test the basic functionality of listing customer orders with pagination.
 *
 * Validates that an authenticated customer can retrieve their order history with proper pagination metadata. This test verifies the empty order list scenario where a newly registered customer has no orders yet.
 *
 * The test ensures that the pagination structure is correctly returned even when no orders exist, with appropriate values for current page, limit, records count, and total pages.
 *
 * 1. Register and authenticate a new customer account
 * 2. Call the orders list endpoint with empty request body (no filters)
 * 3. Verify response contains valid pagination metadata
 * 4. Verify data array is empty (no orders exist)
 * 5. Verify pagination shows 0 records and 0 pages
 */
export async function test_api_customer_orders_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. List orders with empty request (no filters)
  const orders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orders);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", orders.pagination.current, 1);
  TestValidator.predicate("limit is positive", orders.pagination.limit > 0);
  TestValidator.equals("records count is 0", orders.pagination.records, 0);
  TestValidator.equals("pages count is 0", orders.pagination.pages, 0);
  // 4. Validate empty data array
  TestValidator.equals("data array is empty", orders.data.length, 0);
}
