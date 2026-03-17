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
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test order detail retrieval with partially completed order status.
 *
 * This test validates that when an order has items with mixed fulfillment states
 * (some delivered, some still in progress), the order detail correctly reflects
 * the partial completion through individual item statuses. The test creates a
 * customer and seller, places an order with multiple items, ships only some items,
 * confirms delivery, and verifies the order detail shows mixed item statuses.
 *
 * Steps:
 * 1. Register customer account
 * 2. Register seller account
 * 3. Create order with multiple items
 * 4. Seller creates partial shipment (some items only)
 * 5. Customer confirms delivery for shipped items
 * 6. Retrieve and validate order detail shows mixed item statuses
 */
export async function test_api_order_detail_partially_completed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create order with multiple items from the seller
  // The generate_random function handles product/variant setup internally
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Validate order has multiple items for partial shipment testing
  TestValidator.predicate(
    "order has multiple items",
    () => order.items.length >= 2,
  );
  // 4. Seller creates partial shipment (ship only first item, not all)
  const partialItemIds = [order.items[0].id];
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: partialItemIds,
        tracking_carrier: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Validate shipment contains only the partial items
  TestValidator.equals("shipment item count", shipment.items.length, 1);
  TestValidator.equals(
    "shipment has tracking carrier",
    shipment.tracking_carrier,
    "FedEx",
  );
  TestValidator.predicate(
    "shipment has tracking number",
    () => shipment.tracking_number !== null,
  );
  // 5. Customer confirms delivery for the partial shipment
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  TestValidator.predicate(
    "delivery confirmed timestamp exists",
    () => confirmedShipment.delivery_confirmed_at !== null,
  );
  // 6. Retrieve order detail
  const orderDetail = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(orderDetail);
  // Validate order has mixed item statuses (PARTIALLY_COMPLETED scenario)
  const deliveredItems = orderDetail.items.filter(
    (item) => item.status === "DELIVERED",
  );
  const paidItems = orderDetail.items.filter((item) => item.status === "PAID");
  TestValidator.predicate(
    "has delivered items from partial shipment",
    () => deliveredItems.length > 0,
  );
  TestValidator.predicate(
    "has remaining paid items not yet shipped",
    () => paidItems.length > 0,
  );
  TestValidator.equals(
    "all items accounted for",
    deliveredItems.length + paidItems.length,
    orderDetail.items.length,
  );
  // Validate first item (shipped) is DELIVERED
  const firstItem = orderDetail.items.find(
    (item) => item.id === order.items[0].id,
  );
  TestValidator.predicate(
    "first item status is DELIVERED",
    () => firstItem?.status === "DELIVERED",
  );
  // Validate remaining items (not shipped) are still PAID
  const remainingItems = orderDetail.items.filter(
    (item) => item.id !== order.items[0].id,
  );
  remainingItems.forEach((item, index) => {
    TestValidator.equals(
      `remaining item ${index} status is PAID`,
      item.status,
      "PAID",
    );
  });
  // Validate snapshots are preserved for all items
  orderDetail.items.forEach((item, index) => {
    TestValidator.predicate(
      `item ${index} has product snapshot`,
      () => item.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      `item ${index} has variant snapshot`,
      () => item.productVariantSnapshot !== undefined,
    );
    TestValidator.predicate(
      `item ${index} has seller info`,
      () => item.seller !== undefined,
    );
  });
  // Validate order metadata preserved
  TestValidator.equals(
    "order number preserved",
    orderDetail.order_number,
    order.order_number,
  );
  TestValidator.equals(
    "total price preserved",
    orderDetail.total_price,
    order.total_price,
  );
  TestValidator.equals(
    "customer preserved",
    orderDetail.customer.id,
    customerAuth.id,
  );
}
