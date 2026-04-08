import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that order items from different sellers in the same order have independent status tracking.
 *
 * Validates the complete multi-seller order workflow where items from different sellers within a single order maintain independent status lifecycles. Each seller can only access their own order items, and item statuses transition independently as sellers ship at different times.
 *
 * Special attention is given to verifying that order items have independent status values, authorization prevents cross-seller access, and the order-level status correctly reflects mixed item states.
 *
 * 1. Two sellers register and authenticate with separate connections.
 * 2. One customer registers and authenticates with a separate connection.
 * 3. Both sellers create products with names and pricing.
 * 4. Customer completes checkout creating an order with items from both sellers.
 * 5. Seller A ships their order items first, changing status to 'shipped'.
 * 6. Seller A retrieves their order item and verifies status is 'shipped'.
 * 7. Seller B retrieves their order item and verifies status is still 'paid'.
 * 8. Seller B ships their order items, changing status to 'shipped'.
 * 9. Both sellers verify their items now show 'shipped' status.
 */
export async function test_api_order_item_multi_seller_independent_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate two sellers
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerA);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerB);
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 3. Both sellers create products
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productA);
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productB);
  // 4. Customer completes checkout with items from both sellers
  // The utility function handles cart setup and address creation internally
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Extract order items by seller
  const sellerAItems = order.items.filter(
    (item) => item.seller.id === sellerA.id,
  );
  const sellerBItems = order.items.filter(
    (item) => item.seller.id === sellerB.id,
  );
  TestValidator.predicate("has items from seller A", sellerAItems.length > 0);
  TestValidator.predicate("has items from seller B", sellerBItems.length > 0);
  // 5. Seller A ships their items first
  const shipmentA = await generate_random_shopping_mall_seller_shipments_create(
    sellerAConnection,
    {
      body: {
        carrier_name: RandomGenerator.name(),
        tracking_number: RandomGenerator.alphaNumeric(16),
        order_item_ids: sellerAItems.map((item) => item.id),
        order_id: order.id,
      },
    },
  );
  typia.assert(shipmentA);
  // 6. Seller A retrieves their order item and verifies status is 'shipped'
  const orderItemA = await api.functional.shoppingMall.seller.orders.items.at(
    sellerAConnection,
    {
      orderId: order.id,
      itemId: sellerAItems[0].id,
    },
  );
  typia.assert(orderItemA);
  TestValidator.equals(
    "seller A item status is shipped",
    orderItemA.status,
    "shipped",
  );
  // 7. Seller B retrieves their order item and verifies status is still 'paid'
  const orderItemB = await api.functional.shoppingMall.seller.orders.items.at(
    sellerBConnection,
    {
      orderId: order.id,
      itemId: sellerBItems[0].id,
    },
  );
  typia.assert(orderItemB);
  TestValidator.equals(
    "seller B item status is paid",
    orderItemB.status,
    "paid",
  );
  // 8. Seller B ships their items later
  const shipmentB = await generate_random_shopping_mall_seller_shipments_create(
    sellerBConnection,
    {
      body: {
        carrier_name: RandomGenerator.name(),
        tracking_number: RandomGenerator.alphaNumeric(16),
        order_item_ids: sellerBItems.map((item) => item.id),
        order_id: order.id,
      },
    },
  );
  typia.assert(shipmentB);
  // 9. Both sellers verify their items now show 'shipped' status
  const orderItemAAfter =
    await api.functional.shoppingMall.seller.orders.items.at(
      sellerAConnection,
      {
        orderId: order.id,
        itemId: sellerAItems[0].id,
      },
    );
  typia.assert(orderItemAAfter);
  const orderItemBAfter =
    await api.functional.shoppingMall.seller.orders.items.at(
      sellerBConnection,
      {
        orderId: order.id,
        itemId: sellerBItems[0].id,
      },
    );
  typia.assert(orderItemBAfter);
  TestValidator.equals(
    "seller A item status remains shipped",
    orderItemAAfter.status,
    "shipped",
  );
  TestValidator.equals(
    "seller B item status is now shipped",
    orderItemBAfter.status,
    "shipped",
  );
}
