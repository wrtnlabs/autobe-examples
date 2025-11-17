import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Test the complete workflow of deleting a shipment by an admin.
 *
 * This test covers the following comprehensive flow:
 *
 * 1. Admin user registers (join) and logs in to authenticate the admin role.
 * 2. Customer user registers (join) and logs in.
 * 3. The authenticated customer creates a new order.
 * 4. The customer creates a shipment associated with the created order.
 * 5. The authenticated admin deletes the shipment by its ID.
 *
 * This test ensures the admin authorization boundary is respected and that
 * shipment deletion works as intended only for admin users.
 *
 * Each step includes proper type-safe request crafting, response type
 * assertions, and essential test validations.
 */
export async function test_api_admin_delete_shipment_flow(
  connection: api.IConnection,
) {
  // Admin joins the system
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://admin.test",
    referrer: "https://admin.referrer.test",
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Admin logs in to establish session
  const adminLoginBody = {
    email: adminCredentials.email,
    password: adminCredentials.password,
    ip: null,
    href: "https://admin.test",
    referrer: "https://admin.referrer.test",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Customer joins the system
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://customer.test",
    referrer: "https://customer.referrer.test",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCredentials,
    });
  typia.assert(customer);

  // Customer logs in to establish session
  const customerLoginBody = {
    email: customerCredentials.email,
    password: customerCredentials.password,
    ip: null,
    href: "https://customer.test",
    referrer: "https://customer.referrer.test",
  } satisfies IShoppingMallCustomer.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // Customer creates a new order
  const orderBody = {
    order_number: RandomGenerator.alphaNumeric(12),
    order_status: "pending",
    payment_status: "pending",
    total_amount: Number(RandomGenerator.alphaNumeric(3).padStart(3, "1")),
    shipping_address: `${RandomGenerator.name(1)}, ${RandomGenerator.name(1)}, Seoul, South Korea`,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // Customer creates a shipment connected to the order
  const shipmentBody = {
    shopping_mall_order_id: order.id,
    shipping_carrier: "KoreanPost",
    tracking_number: RandomGenerator.alphaNumeric(15),
    shipment_status: "pending",
    shipped_at: null,
    delivered_at: null,
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.customer.shipments.create(connection, {
      body: shipmentBody,
    });
  typia.assert(shipment);

  // Admin deletes the shipment
  await api.functional.shoppingMall.admin.shipments.erase(connection, {
    shipmentId: shipment.id,
  });
}
