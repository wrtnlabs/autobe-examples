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

export async function test_api_shipment_delivery_confirmation_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success path where a customer confirms delivery for a shipment they own.
   *
   * Workflow:
   * 1. Register and authenticate customer
   * 2. Register and authenticate seller
   * 3. Customer creates an order
   * 4. Seller creates a shipment for the order items
   * 5. Customer confirms delivery for the shipment
   * 6. Validate delivery confirmation results
   */
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Customer creates an order
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Validate order was created successfully
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  TestValidator.equals("order status is paid", order.status, "paid");
  // 4. Seller creates a shipment for the order items
  const shipment: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: order.orderItems.map((item) => item.id),
          tracking_carrier: RandomGenerator.pick(["FedEx", "UPS", "DHL"]),
          tracking_number: RandomGenerator.alphaNumeric(20),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Validate shipment was created successfully
  TestValidator.equals(
    "shipment has items",
    shipment.orderItems.length,
    order.orderItems.length,
  );
  TestValidator.predicate(
    "shipment not yet delivered",
    !shipment.delivery_confirmed,
  );
  TestValidator.equals("delivered_at is null", shipment.delivered_at, null);
  // 5. Customer confirms delivery for the shipment
  const confirmedShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 6. Validate delivery confirmation results
  TestValidator.equals(
    "shipment ID matches",
    confirmedShipment.id,
    shipment.id,
  );
  TestValidator.predicate(
    "delivery confirmed",
    confirmedShipment.delivery_confirmed === true,
  );
  TestValidator.predicate(
    "delivered_at is set",
    confirmedShipment.delivered_at !== null,
  );
  // Validate all order items in shipment have status 'delivered'
  await ArrayUtil.asyncForEach(confirmedShipment.orderItems, async (item) => {
    TestValidator.equals(
      "order item status is delivered",
      item.status,
      "delivered",
    );
  });
  // Validate delivered_at timestamp format
  TestValidator.predicate("delivered_at is valid date-time format", () => {
    if (confirmedShipment.delivered_at === null) return false;
    const date = new Date(confirmedShipment.delivered_at);
    return !isNaN(date.getTime());
  });
}