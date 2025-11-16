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
 * Test the process of shipment creation by an admin user.
 *
 * The scenario authenticates a new admin user by joining and logging in. Then
 * it authenticates a customer user by joining and logging in, creates a new
 * shopping mall order as that customer, switches back to the admin user, and
 * finally creates the shipment record linked to the created order.
 *
 * The test validates that all operations succeed and the shipment references
 * the correct order.
 */
export async function test_api_shipment_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminName: string = RandomGenerator.name();
  const adminPassword = "StrongPassword123!";

  const adminCreateBody = {
    email: adminEmail,
    name: adminName,
    password: adminPassword,
    role: RandomGenerator.pick(["superadmin", "admin", "support"] as const),
    phone_number: null,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 2. Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "http://localhost/login",
    referrer: "http://localhost",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin);

  // 3. Customer join
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerCreateBody = {
    email: customerEmail,
    password: adminPassword, // reuse password for simplicity
    full_name: RandomGenerator.name(),
    ip: null,
    href: "http://localhost/signup",
    referrer: "http://localhost",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 4. Customer login
  const customerLoginBody = {
    email: customerEmail,
    password: adminPassword,
    ip: null,
    href: "http://localhost/login",
    referrer: "http://localhost",
  } satisfies IShoppingMallCustomer.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 5. Customer creates an order
  const orderCreateBody = {
    order_number: RandomGenerator.alphaNumeric(12).toUpperCase(),
    status: "pending",
    payment_status: "pending",
    total_amount: Math.floor(10000 + Math.random() * 90000),
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      { body: orderCreateBody },
    );
  typia.assert(order);

  // 6. Admin login again (to refresh session and ensure admin context)
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoginAgain);

  // 7. Admin creates a shipment linked to the created order
  const shipmentCreateBody = {
    shoppingMallOrderId: order.id,
    shippingMethod: "standard",
    trackingNumber: null,
    status: "pending",
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.shoppingMallShipments.create(
      connection,
      { body: shipmentCreateBody },
    );
  typia.assert(shipment);

  // Validate linkage integrity
  TestValidator.equals(
    "shipment.shoppingMallOrderId matches order.id",
    shipment.shoppingMallOrderId,
    order.id,
  );
}
