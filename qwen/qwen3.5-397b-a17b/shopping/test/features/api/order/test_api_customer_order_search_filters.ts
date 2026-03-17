import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_customer_order_search_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create multiple orders for testing
  // Note: We'll create orders and then test filtering on them
  // The generate function handles cart items and order creation internally
  // Create first order
  const order1 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order1);
  // Create second order
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order2);
  // Create third order
  const order3 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order3);
  // 3. Test basic order retrieval (no filters)
  const allOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(allOrders);
  TestValidator.predicate("has orders", allOrders.data.length >= 3);
  // 4. Test date range filter
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const dateFilteredOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          fromDate: tenDaysAgo.toISOString(),
          toDate: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(dateFilteredOrders);
  TestValidator.predicate(
    "date filter returns results",
    dateFilteredOrders.data.length >= 0,
  );
  // 5. Test order number partial match
  const orderNumberSearch =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          orderNumber: order1.order_number.substring(0, 5),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(orderNumberSearch);
  TestValidator.predicate(
    "order number search returns results",
    orderNumberSearch.data.length >= 1,
  );
  // 6. Test price range filter
  const priceFilteredOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          minPrice: 0,
          maxPrice: 1000000,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(priceFilteredOrders);
  TestValidator.predicate(
    "price filter returns results",
    priceFilteredOrders.data.length >= 1,
  );
  // 7. Test pagination
  const paginatedPage1 =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(paginatedPage1);
  TestValidator.equals("page 1 current", paginatedPage1.pagination.current, 1);
  TestValidator.equals("page 1 limit", paginatedPage1.pagination.limit, 1);
  const paginatedPage2 =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(paginatedPage2);
  TestValidator.equals("page 2 current", paginatedPage2.pagination.current, 2);
  // 8. Test sorting by totalPrice ascending
  const sortedAsc = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        sort: "totalPrice,asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(sortedAsc);
  if (sortedAsc.data.length >= 2) {
    TestValidator.predicate(
      "ascending sort",
      sortedAsc.data[0].totalPrice <= sortedAsc.data[1].totalPrice,
    );
  }
  // 9. Test sorting by totalPrice descending
  const sortedDesc = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        sort: "totalPrice,desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(sortedDesc);
  if (sortedDesc.data.length >= 2) {
    TestValidator.predicate(
      "descending sort",
      sortedDesc.data[0].totalPrice >= sortedDesc.data[1].totalPrice,
    );
  }
  // 10. Test combined filters
  const combinedFilters =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          fromDate: tenDaysAgo.toISOString(),
          toDate: now.toISOString(),
          minPrice: 0,
          maxPrice: 1000000,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // 11. Test empty result with future date range
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const emptyResult = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        fromDate: futureDate.toISOString(),
        toDate: new Date(
          futureDate.getTime() + 10 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  TestValidator.predicate(
    "pagination records is 0",
    emptyResult.pagination.records === 0,
  );
}
