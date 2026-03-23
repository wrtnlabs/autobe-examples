import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_create_multi_item_bundle(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success path where an authenticated seller creates a shipment
   * bundling multiple order items from their products.
   *
   * Setup:
   * 1. Register and authenticate as Seller A
   * 2. Register and authenticate as Customer
   * 3. Customer creates an order containing multiple items from Seller A's products
   * 4. Verify order items are in 'paid' status
   *
   * Test Execution:
   * 1. Seller A creates a shipment bundling multiple order items
   *
   * Expected Results:
   * 1. Shipment created successfully with correct tracking information
   * 2. All included order items have status changed from 'paid' to 'shipped'
   * 3. Shipment has delivery_confirmed = false and delivered_at = null
   */
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Customer creates an order with multiple items
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Verify order has multiple items
  TestValidator.predicate(
    "order has multiple items",
    order.orderItems.length >= 2,
  );
  // Verify all order items are in 'paid' status
  TestValidator.predicate(
    "all order items are in paid status",
    order.orderItems.every((item) => item.status === "paid"),
  );
  // 4. Seller creates shipment bundling multiple order items
  const orderItemIds = order.orderItems
    .slice(0, Math.min(3, order.orderItems.length))
    .map((item) => item.id);
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: orderItemIds,
          tracking_carrier: "FedEx",
          tracking_number: "1234567890",
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 5. Validate shipment creation
  TestValidator.equals(
    "shipment tracking carrier matches",
    shipment.tracking_carrier,
    "FedEx",
  );
  TestValidator.equals(
    "shipment tracking number matches",
    shipment.tracking_number,
    "1234567890",
  );
  // 6. Verify shipment has correct order items
  TestValidator.equals(
    "shipment contains correct number of order items",
    shipment.orderItems.length,
    orderItemIds.length,
  );
  // 7. Verify all order items in shipment are in 'shipped' status
  TestValidator.predicate(
    "all order items in shipment are shipped",
    shipment.orderItems.every((item) => item.status === "shipped"),
  );
  // 8. Verify shipment delivery status
  TestValidator.equals(
    "delivery confirmed is false",
    shipment.delivery_confirmed,
    false,
  );
  TestValidator.equals("delivered_at is null", shipment.delivered_at, null);
  // 9. Verify shipment has shipped_at timestamp
  TestValidator.predicate(
    "shipment has shipped_at timestamp",
    shipment.shipped_at !== undefined && shipment.shipped_at !== null,
  );
  // 10. Verify seller information is correctly associated
  TestValidator.equals(
    "shipment seller matches authenticated seller",
    shipment.seller.email,
    sellerEmail,
  );
  // 11. Verify all requested order item IDs are present in shipment
  TestValidator.predicate(
    "all requested order items are in shipment",
    orderItemIds.every((id) =>
      shipment.orderItems.some((item) => item.id === id),
    ),
  );
}
