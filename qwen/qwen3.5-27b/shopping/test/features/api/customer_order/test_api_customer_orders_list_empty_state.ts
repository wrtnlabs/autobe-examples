import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
 * Test order listing for a customer with no orders (empty state scenario).
 *
 * This test verifies that the order listing endpoint correctly handles the
 * empty state when a customer has not placed any orders. It validates that:
 * - The API returns a valid paginated response structure
 * - Pagination metadata correctly shows 0 records and 0 pages
 * - The data array is empty
 * - Custom pagination parameters are respected
 * - Various filters can be applied without errors
 */
export async function test_api_customer_orders_list_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Test with default parameters (no body)
  const defaultResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Verify default pagination metadata
  TestValidator.equals(
    "default current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals("default limit", defaultResponse.pagination.limit, 20);
  TestValidator.equals(
    "default records count",
    defaultResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "default pages count",
    defaultResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "default data array is empty",
    defaultResponse.data.length,
    0,
  );
  // 3. Test with custom pagination parameters
  const customPaginationResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(customPaginationResponse);
  TestValidator.equals(
    "custom current page",
    customPaginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit",
    customPaginationResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "custom records count",
    customPaginationResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "custom pages count",
    customPaginationResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "custom data array is empty",
    customPaginationResponse.data.length,
    0,
  );
  // 4. Test with status filter
  const statusFilterResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "paid",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(statusFilterResponse);
  TestValidator.equals(
    "status filter records count",
    statusFilterResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "status filter data array is empty",
    statusFilterResponse.data.length,
    0,
  );
  // 5. Test with date range filter
  const dateRangeResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          created_at_start: new Date("2024-01-01T00:00:00Z").toISOString(),
          created_at_end: new Date("2024-12-31T23:59:59Z").toISOString(),
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  TestValidator.equals(
    "date range filter records count",
    dateRangeResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "date range filter data array is empty",
    dateRangeResponse.data.length,
    0,
  );
  // 6. Test with price range filter
  const priceRangeResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          total_price_min: 1000,
          total_price_max: 10000,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(priceRangeResponse);
  TestValidator.equals(
    "price range filter records count",
    priceRangeResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "price range filter data array is empty",
    priceRangeResponse.data.length,
    0,
  );
  // 7. Test with sorting parameters
  const sortingResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          sort_direction: "desc",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(sortingResponse);
  TestValidator.equals(
    "sorting filter records count",
    sortingResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "sorting filter data array is empty",
    sortingResponse.data.length,
    0,
  );
  // 8. Test with all filters combined
  const allFiltersResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "delivered",
          created_at_start: new Date("2024-06-01T00:00:00Z").toISOString(),
          created_at_end: new Date("2024-06-30T23:59:59Z").toISOString(),
          total_price_min: 5000,
          total_price_max: 15000,
          page: 2,
          limit: 50,
          sort: "total_price",
          sort_direction: "asc",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(allFiltersResponse);
  TestValidator.equals(
    "all filters current page",
    allFiltersResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "all filters limit",
    allFiltersResponse.pagination.limit,
    50,
  );
  TestValidator.equals(
    "all filters records count",
    allFiltersResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "all filters pages count",
    allFiltersResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "all filters data array is empty",
    allFiltersResponse.data.length,
    0,
  );
}
