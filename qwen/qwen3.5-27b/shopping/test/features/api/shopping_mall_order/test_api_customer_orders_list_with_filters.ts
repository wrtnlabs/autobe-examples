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
 * Test order listing with various filter criteria including status, date range, and price range.
 *
 * This test validates the order listing functionality with comprehensive filtering and sorting options.
 * It covers status filtering, date range filtering, price range filtering, combined filters,
 * sorting by different fields, and pagination accuracy.
 */
export async function test_api_customer_orders_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
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
  typia.assert(customer);
  // 2. Test status filter: Request orders with status='delivered' only
  const statusFilterRequest = {
    status: "delivered",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrder.IRequest;
  const statusFilteredResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      { body: statusFilterRequest },
    );
  typia.assert(statusFilteredResult);
  // Verify all returned orders have status='delivered'
  TestValidator.predicate(
    "all orders have delivered status",
    statusFilteredResult.data.every((order) => order.status === "delivered"),
  );
  // 3. Test date range filter: Request orders created between specific dates
  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = new Date();
  const dateFilterRequest = {
    created_at_start: startDate.toISOString(),
    created_at_end: endDate.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrder.IRequest;
  const dateFilteredResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      { body: dateFilterRequest },
    );
  typia.assert(dateFilteredResult);
  // Verify all returned orders are within the date range
  TestValidator.predicate(
    "all orders within date range",
    dateFilteredResult.data.every((order) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate && orderDate <= endDate;
    }),
  );
  // 4. Test price range filter: Request orders with total_price between min and max
  const priceFilterRequest = {
    total_price_min: 1000,
    total_price_max: 100000,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrder.IRequest;
  const priceFilteredResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      { body: priceFilterRequest },
    );
  typia.assert(priceFilteredResult);
  // Verify all returned orders are within the price range
  TestValidator.predicate(
    "all orders within price range",
    priceFilteredResult.data.every(
      (order) => order.total_price >= 1000 && order.total_price <= 100000,
    ),
  );
  // 5. Test combined filters: Apply multiple filters simultaneously
  const combinedFilterRequest = {
    status: "delivered",
    created_at_start: startDate.toISOString(),
    created_at_end: endDate.toISOString(),
    total_price_min: 1000,
    total_price_max: 100000,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrder.IRequest;
  const combinedFilteredResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      { body: combinedFilterRequest },
    );
  typia.assert(combinedFilteredResult);
  // Verify all filter criteria are applied (AND logic)
  TestValidator.predicate(
    "all orders match combined filters",
    combinedFilteredResult.data.every((order) => {
      const orderDate = new Date(order.created_at);
      return (
        order.status === "delivered" &&
        orderDate >= startDate &&
        orderDate <= endDate &&
        order.total_price >= 1000 &&
        order.total_price <= 100000
      );
    }),
  );
  // 6. Test sorting by created_at descending (default)
  const sortByDateDescRequest = {
    sort: "created_at",
    sort_direction: "desc",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrder.IRequest;
  const sortByDateDescResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      { body: sortByDateDescRequest },
    );
  typia.assert(sortByDateDescResult);
  // Verify orders are sorted by created_at descending
  if (sortByDateDescResult.data.length > 1) {
    TestValidator.predicate(
      "orders sorted by created_at descending",
      sortByDateDescResult.data.every((order, index, array) => {
        if (index === 0) return true;
        const prevDate = new Date(array[index - 1].created_at);
        const currDate = new Date(order.created_at);
        return prevDate >= currDate;
      }),
    );
  }
  // 7. Test sorting by created_at ascending
  const sortByDateAscRequest = {
    sort: "created_at",
    sort_direction: "asc",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrder.IRequest;
  const sortByDateAscResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      { body: sortByDateAscRequest },
    );
  typia.assert(sortByDateAscResult);
  // Verify orders are sorted by created_at ascending
  if (sortByDateAscResult.data.length > 1) {
    TestValidator.predicate(
      "orders sorted by created_at ascending",
      sortByDateAscResult.data.every((order, index, array) => {
        if (index === 0) return true;
        const prevDate = new Date(array[index - 1].created_at);
        const currDate = new Date(order.created_at);
        return prevDate <= currDate;
      }),
    );
  }
  // 8. Test sorting by total_price descending
  const sortByPriceDescRequest = {
    sort: "total_price",
    sort_direction: "desc",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrder.IRequest;
  const sortByPriceDescResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      { body: sortByPriceDescRequest },
    );
  typia.assert(sortByPriceDescResult);
  // Verify orders are sorted by total_price descending
  if (sortByPriceDescResult.data.length > 1) {
    TestValidator.predicate(
      "orders sorted by total_price descending",
      sortByPriceDescResult.data.every((order, index, array) => {
        if (index === 0) return true;
        return array[index - 1].total_price >= order.total_price;
      }),
    );
  }
  // 9. Test sorting by total_price ascending
  const sortByPriceAscRequest = {
    sort: "total_price",
    sort_direction: "asc",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrder.IRequest;
  const sortByPriceAscResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      { body: sortByPriceAscRequest },
    );
  typia.assert(sortByPriceAscResult);
  // Verify orders are sorted by total_price ascending
  if (sortByPriceAscResult.data.length > 1) {
    TestValidator.predicate(
      "orders sorted by total_price ascending",
      sortByPriceAscResult.data.every((order, index, array) => {
        if (index === 0) return true;
        return array[index - 1].total_price <= order.total_price;
      }),
    );
  }
  // 10. Test pagination: Verify pagination metadata is accurate
  const paginationRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallOrder.IRequest;
  const paginationResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      { body: paginationRequest },
    );
  typia.assert(paginationResult);
  // Verify pagination metadata
  TestValidator.equals(
    "current page matches request",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginationResult.data.length <= 10,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    paginationResult.pagination.pages ===
      Math.ceil(
        paginationResult.pagination.records / paginationResult.pagination.limit,
      ),
  );
  // 11. Test empty results when no orders match filters
  const emptyFilterRequest = {
    status: "cancelled",
    total_price_min: 999999999,
    total_price_max: 999999999,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrder.IRequest;
  const emptyResult = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    { body: emptyFilterRequest },
  );
  typia.assert(emptyResult);
  // Verify empty results are returned (not an error)
  TestValidator.equals(
    "empty results when no orders match",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "records count is zero",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("pages count is zero", emptyResult.pagination.pages, 0);
}
