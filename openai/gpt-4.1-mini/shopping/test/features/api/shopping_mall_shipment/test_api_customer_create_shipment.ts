import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

export async function test_api_customer_create_shipment(
  connection: api.IConnection,
) {
  // 1. Register new customer user
  const customerCreationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
    href: RandomGenerator.alphaNumeric(20),
    referrer: RandomGenerator.alphaNumeric(20),
  } satisfies IShoppingMallCustomer.ICreate;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreationBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a new order associated with the customer
  // Compose order create data with required properties
  const orderCreateBody = {
    order_number: `ORDER-${RandomGenerator.alphaNumeric(10)}`,
    order_status: "pending",
    payment_status: "pending",
    total_amount: RandomGenerator.alphabets(5).length * 10, // some arbitrary positive amount
    shipping_address: RandomGenerator.alphaNumeric(30),
  } satisfies IShoppingMallOrder.ICreate;
  const createdOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(createdOrder);

  // 3. Create shipment linked to the created order
  const shipmentCreateBody = {
    shopping_mall_order_id: createdOrder.id,
    shipping_carrier: "FedEx",
    tracking_number: `TRACK${RandomGenerator.alphaNumeric(8)}`,
    shipment_status: "pending",
    shipped_at: null,
    delivered_at: null,
  } satisfies IShoppingMallShipment.ICreate;
  const createdShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.customer.shipments.create(connection, {
      body: shipmentCreateBody,
    });
  typia.assert(createdShipment);

  // Validate the shipment is correctly linked to the order
  TestValidator.equals(
    "shipment order ID should match order ID",
    createdShipment.shopping_mall_order_id,
    createdOrder.id,
  );
  TestValidator.equals(
    "shipment status should be 'pending'",
    createdShipment.status,
    "pending",
  );
}
