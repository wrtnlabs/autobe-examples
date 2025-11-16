import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

export async function test_api_shipment_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins the service
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://test.customer.signup/",
    referrer: "https://test.referrer/",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Customer creates a shopping mall order
  const orderCreateBody = {
    order_number: RandomGenerator.pick([
      "ORD001",
      "ORD002",
      "ORD003",
      "ORD004",
    ] as const),
    status: "pending",
    payment_status: "pending",
    total_amount: 110,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      { body: orderCreateBody },
    );
  typia.assert(order);

  // 3. Admin joins the service
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "adminPassword1",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 4. Admin creates a shipment linked to the created order
  const shipmentCreateBody = {
    shoppingMallOrderId: order.id,
    shippingMethod: RandomGenerator.pick([
      "standard",
      "express",
      "overnight",
    ] as const),
    trackingNumber: null,
    status: "pending",
  } satisfies IShoppingMallShipment.ICreate;
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.shoppingMallShipments.create(
      connection,
      { body: shipmentCreateBody },
    );
  typia.assert(shipment);

  // 5. Customer retrieves shipment details by shipment ID
  const retrievedShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.customer.shoppingMallShipments.at(
      connection,
      { shoppingMallShipmentId: shipment.id },
    );
  typia.assert(retrievedShipment);

  // Assert that the retrieved shipment matches the created shipment data
  TestValidator.equals(
    "shipment id matches",
    retrievedShipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "shipment order id matches",
    retrievedShipment.shoppingMallOrderId,
    order.id,
  );
  TestValidator.equals(
    "shipment status matches",
    retrievedShipment.status,
    shipment.status,
  );
  TestValidator.equals(
    "shipment shipping method matches",
    retrievedShipment.shippingMethod,
    shipment.shippingMethod,
  );
}
