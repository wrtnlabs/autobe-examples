import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test seller order items listing with pagination and filtering capabilities.
 *
 * This test validates that sellers can retrieve their order items with various
 * filters and pagination controls, ensuring proper data isolation and response structure.
 */
export async function test_api_seller_order_items_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
    },
  });
  typia.assert(sellerAuth);
  // 2. Setup: Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerAuth);
  // 3. Setup: Create orders with items from the seller's products
  // Note: In a real scenario, we'd need products first, but the generate function
  // handles the complete order creation workflow
  const order1 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order1);
  // Create a second order to test pagination
  const order2 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order2);
  // 4. Test: Retrieve order items with default pagination
  const defaultResponse =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    defaultResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // Verify order items structure
  if (defaultResponse.data.length > 0) {
    const firstItem = defaultResponse.data[0];
    typia.assert(firstItem);
    // Verify required fields exist
    TestValidator.predicate(
      "order item has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstItem.id,
      ),
    );
    TestValidator.predicate(
      "order item has orderId",
      firstItem.orderId !== undefined,
    );
    TestValidator.predicate(
      "order item has status",
      firstItem.status !== undefined,
    );
    TestValidator.predicate("order item has quantity", firstItem.quantity > 0);
    TestValidator.predicate("order item has price", firstItem.price >= 0);
    TestValidator.predicate(
      "order item has createdAt",
      firstItem.createdAt !== undefined,
    );
  }
  // 5. Test: Filter by status='paid'
  const paidFilterResponse =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {
          status: "paid",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(paidFilterResponse);
  // Verify all returned items have 'paid' status
  if (paidFilterResponse.data.length > 0) {
    const allPaid = paidFilterResponse.data.every(
      (item) => item.status === "paid",
    );
    TestValidator.predicate("all items have paid status", allPaid);
  }
  // 6. Test: Filter by specific orderId
  const orderIdFilterResponse =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {
          orderId: order1.id,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(orderIdFilterResponse);
  // Verify all items belong to the specified order
  if (orderIdFilterResponse.data.length > 0) {
    const allFromOrder1 = orderIdFilterResponse.data.every(
      (item) => item.orderId === order1.id,
    );
    TestValidator.predicate(
      "all items belong to specified order",
      allFromOrder1,
    );
  }
  // 7. Test: Filter by price range
  const priceFilterResponse =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {
          priceMin: 0,
          priceMax: 1000000,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(priceFilterResponse);
  // Verify all items are within price range
  if (priceFilterResponse.data.length > 0) {
    const allInRange = priceFilterResponse.data.every(
      (item) => item.price >= 0 && item.price <= 1000000,
    );
    TestValidator.predicate("all items within price range", allInRange);
  }
  // 8. Test: Filter by quantity range
  const quantityFilterResponse =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {
          quantityMin: 1,
          quantityMax: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(quantityFilterResponse);
  // Verify all items are within quantity range
  if (quantityFilterResponse.data.length > 0) {
    const allInRange = quantityFilterResponse.data.every(
      (item) => item.quantity >= 1 && item.quantity <= 100,
    );
    TestValidator.predicate("all items within quantity range", allInRange);
  }
  // 9. Test: Filter by date range
  const dateFilterResponse =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: order1.created_at,
          createdAtTo: new Date().toISOString(),
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(dateFilterResponse);
  // Verify all items are within date range
  if (dateFilterResponse.data.length > 0) {
    const fromDate = new Date(order1.created_at).getTime();
    const toDate = new Date().getTime();
    const allInRange = dateFilterResponse.data.every((item) => {
      const itemDate = new Date(item.createdAt).getTime();
      return itemDate >= fromDate && itemDate <= toDate;
    });
    TestValidator.predicate("all items within date range", allInRange);
  }
  // 10. Test: Pagination with custom page and limit
  const paginationResponse =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(paginationResponse);
  // Verify pagination settings
  TestValidator.equals(
    "pagination current page",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginationResponse.data.length <= 10,
  );
  // 11. Test: Maximum limit (100)
  const maxLimitResponse =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {
          limit: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit accepted",
    maxLimitResponse.pagination.limit,
    100,
  );
  // 12. Test: Sorting by created_at DESC (default)
  const sortedResponse =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedResponse);
  // Verify items are sorted by created_at DESC
  if (sortedResponse.data.length > 1) {
    let isSorted = true;
    for (let i = 1; i < sortedResponse.data.length; i++) {
      const prevDate = new Date(sortedResponse.data[i - 1].createdAt).getTime();
      const currDate = new Date(sortedResponse.data[i].createdAt).getTime();
      if (prevDate < currDate) {
        isSorted = false;
        break;
      }
    }
    TestValidator.predicate("items sorted by created_at DESC", isSorted);
  }
}
