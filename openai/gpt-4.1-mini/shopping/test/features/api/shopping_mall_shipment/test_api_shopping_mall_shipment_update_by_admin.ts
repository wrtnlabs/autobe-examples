import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

export async function test_api_shopping_mall_shipment_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins the platform
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    phone_number: RandomGenerator.mobile(),
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Admin login to renew auth token explicitly
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://localhost/admin/login",
    referrer: "https://localhost/admin",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Customer joins the platform
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustPass123!";
  const customerCreateBody = {
    email: customerEmail,
    password: customerPassword,
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://localhost/signup",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 4. Customer login to renew auth token explicitly
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    href: "https://localhost/login",
    referrer: "https://localhost/home",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 5. Customer creates a shopping mall order
  const orderCreateBody = {
    order_number: RandomGenerator.alphaNumeric(12),
    status: "pending",
    payment_status: "pending",
    total_amount: 100000,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: orderCreateBody,
      },
    );
  typia.assert(order);

  // 6. Admin creates an initial shipment for the order
  const shipmentCreateBody = {
    shoppingMallOrderId: order.id,
    shippingMethod: "Standard",
    trackingNumber: null,
    status: "pending",
  } satisfies IShoppingMallShipment.ICreate;
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.shoppingMallShipments.create(
      connection,
      {
        body: shipmentCreateBody,
      },
    );
  typia.assert(shipment);

  // 7. Admin updates the shipment with new details
  const shipmentUpdateBody = {
    shippingMethod: "Express",
    trackingNumber: RandomGenerator.alphaNumeric(16),
    status: "shipped",
    updatedAt: new Date().toISOString(),
  } satisfies IShoppingMallShipment.IUpdate;
  const updatedShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.shoppingMallShipments.update(
      connection,
      {
        shoppingMallShipmentId: shipment.id,
        body: shipmentUpdateBody,
      },
    );
  typia.assert(updatedShipment);

  // 8. Validate updates
  TestValidator.equals(
    "shipment id must not change",
    updatedShipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "shipment order id must be same",
    updatedShipment.shoppingMallOrderId,
    order.id,
  );
  TestValidator.equals(
    "updated shipping method",
    updatedShipment.shippingMethod,
    shipmentUpdateBody.shippingMethod!,
  );
  TestValidator.equals(
    "updated tracking number",
    updatedShipment.trackingNumber,
    shipmentUpdateBody.trackingNumber!,
  );
  TestValidator.equals(
    "updated status",
    updatedShipment.status,
    shipmentUpdateBody.status!,
  );
  TestValidator.predicate(
    "updatedAt should be recent ISO date",
    typeof updatedShipment.updatedAt === "string" &&
      updatedShipment.updatedAt.length > 0,
  );
}
