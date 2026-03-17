import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test seller ability to adjust order item quantity before shipment.
 *
 * This test validates that sellers can update order item quantities and unit prices
 * for orders in PAID status (before shipment). The scenario:
 * 1. Seller registers and logs in
 * 2. Customer registers and logs in
 * 3. Customer creates an order with product variants
 * 4. Seller updates the order item quantity (e.g., 5 → 3 for partial fulfillment)
 * 5. Seller optionally adjusts unit_price if needed
 * 6. Validate updated_at timestamp changed and quantity/price updates persisted
 */
export async function test_api_order_item_quantity_adjustment_before_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerJoin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    },
  });
  typia.assert(sellerLogin);
  // 2. Customer setup - register and login
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    },
  });
  typia.assert(customerJoin);
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerLogin);
  // 3. Customer creates an order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 4. Validate order has items in PAID status
  TestValidator.predicate("order has items", order.items.length > 0);
  const orderItem = order.items[0];
  TestValidator.equals("initial status is PAID", orderItem.status, "PAID");
  const initialQuantity = orderItem.quantity;
  const initialUnitPrice = orderItem.unitPrice;
  const initialUpdatedAt = orderItem.updatedAt;
  // 5. Seller updates order item quantity (partial fulfillment scenario)
  // Reduce quantity from initial to a lower positive value
  const newQuantity = Math.max(1, initialQuantity - 2);
  const newUnitPrice = initialUnitPrice * 0.9; // 10% price adjustment
  const updatedOrderItem =
    await api.functional.shoppingMall.seller.order_items.update(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          quantity: newQuantity,
          unit_price: newUnitPrice,
        } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(updatedOrderItem);
  // 6. Validate updates were applied
  TestValidator.equals(
    "quantity updated",
    updatedOrderItem.quantity,
    newQuantity,
  );
  TestValidator.equals(
    "unit price updated",
    updatedOrderItem.unitPrice,
    newUnitPrice,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    initialUpdatedAt,
    updatedOrderItem.updatedAt,
  );
  TestValidator.equals("status remains PAID", updatedOrderItem.status, "PAID");
  // 7. Validate quantity is positive integer
  TestValidator.predicate(
    "quantity is positive",
    updatedOrderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "unit price is non-negative",
    updatedOrderItem.unitPrice >= 0,
  );
}