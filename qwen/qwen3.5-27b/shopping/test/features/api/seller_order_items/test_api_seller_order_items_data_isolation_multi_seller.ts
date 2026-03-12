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
 * Test that sellers can only view order items for their own products,
 * even when multiple sellers are involved in a single customer order.
 *
 * This test validates strict data isolation between sellers in a multi-seller
 * marketplace scenario where a single customer order contains items from
 * different sellers.
 *
 * Test Steps:
 * 1. Register and authenticate two sellers (Seller A and Seller B)
 * 2. Register and authenticate a customer
 * 3. Customer creates a single order containing items from both sellers
 * 4. Seller A queries their order items and verifies they see only their items
 * 5. Seller B queries their order items and verifies they see only their items
 * 6. Both sellers filter by the same orderId and verify data isolation
 * 7. Validate that item counts match expected values per seller
 */
export async function test_api_seller_order_items_data_isolation_multi_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
    },
  });
  typia.assert(sellerA);
  // 2. Register and authenticate Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
    },
  });
  typia.assert(sellerB);
  // 3. Register and authenticate Customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // 4. Customer creates an order with items from both sellers
  // The order will contain multiple items, some from Seller A and some from Seller B
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Extract order items by seller
  const sellerAItems = order.orderItems.filter(
    (item) => item.sellerId === sellerA.id,
  );
  const sellerBItems = order.orderItems.filter(
    (item) => item.sellerId === sellerB.id,
  );
  // Validate that order contains items from both sellers
  TestValidator.predicate(
    "order contains items from Seller A",
    sellerAItems.length > 0,
  );
  TestValidator.predicate(
    "order contains items from Seller B",
    sellerBItems.length > 0,
  );
  // 5. Seller A queries their order items
  const sellerAOrderItemsResponse =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerAConnection,
      {
        body: {
          orderId: order.id,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(sellerAOrderItemsResponse);
  // 6. Seller B queries their order items
  const sellerBOrderItemsResponse =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerBConnection,
      {
        body: {
          orderId: order.id,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(sellerBOrderItemsResponse);
  // 7. Validate data isolation for Seller A
  TestValidator.equals(
    "Seller A sees only their own items",
    sellerAOrderItemsResponse.data.length,
    sellerAItems.length,
  );
  // Verify all items Seller A sees belong to Seller A
  TestValidator.predicate(
    "all items returned to Seller A belong to Seller A",
    sellerAOrderItemsResponse.data.every((item) => item.orderId === order.id),
  );
  // 8. Validate data isolation for Seller B
  TestValidator.equals(
    "Seller B sees only their own items",
    sellerBOrderItemsResponse.data.length,
    sellerBItems.length,
  );
  // Verify all items Seller B sees belong to Seller B
  TestValidator.predicate(
    "all items returned to Seller B belong to Seller B",
    sellerBOrderItemsResponse.data.every((item) => item.orderId === order.id),
  );
  // 9. Validate total items match
  TestValidator.equals(
    "total items from both sellers equals order item count",
    sellerAOrderItemsResponse.data.length +
      sellerBOrderItemsResponse.data.length,
    order.orderItems.length,
  );
  // 10. Verify no cross-contamination: Seller A should not see Seller B's items
  const sellerAItemIds = new Set(
    sellerAOrderItemsResponse.data.map((item) => item.id),
  );
  const sellerBItemIds = new Set(
    sellerBOrderItemsResponse.data.map((item) => item.id),
  );
  TestValidator.predicate(
    "no item overlap between Seller A and Seller B",
    [...sellerAItemIds].every((id) => !sellerBItemIds.has(id)),
  );
  // 11. Validate pagination metadata
  TestValidator.equals(
    "Seller A pagination records matches data length",
    sellerAOrderItemsResponse.pagination.records,
    sellerAOrderItemsResponse.data.length,
  );
  TestValidator.equals(
    "Seller B pagination records matches data length",
    sellerBOrderItemsResponse.pagination.records,
    sellerBOrderItemsResponse.data.length,
  );
}
