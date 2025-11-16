import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

export async function test_api_shopping_mall_shipment_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "SecurePass123!",
    phone_number: RandomGenerator.mobile(),
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin1: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin1);

  // 2. Admin login to ensure session and actor switching
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com",
  } satisfies IShoppingMallAdmin.ILogin;
  const admin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(admin2);

  // 3. Register a customer
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerPass123!",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/customer/join",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 4. Customer login
  const customerLoginBody = {
    email: customerCreateBody.email,
    password: customerCreateBody.password,
    ip: null,
    href: "https://example.com/customer/login",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 5. Create an order as customer
  const orderCreateBody = {
    order_number: RandomGenerator.alphaNumeric(12),
    status: "pending",
    payment_status: "pending",
    total_amount: Math.floor(Math.random() * 10000) + 1000,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      { body: orderCreateBody },
    );
  typia.assert(order);

  // 6. Switch back to admin login
  const adminLogin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin2);

  // 7. Create a shipment linked to the order
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

  // 8. Delete the created shipment as admin
  await api.functional.shoppingMall.admin.shoppingMallShipments.erase(
    connection,
    {
      shoppingMallShipmentId: shipment.id,
    },
  );

  // 9. Attempt to delete the shipment again to confirm deletion (should not throw, but normally would error - here we don't have a get endpoint to confirm absence, so rely on no error on second delete)
  await TestValidator.error(
    "Deleting non-existent shipment should fail",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallShipments.erase(
        connection,
        {
          shoppingMallShipmentId: shipment.id,
        },
      );
    },
  );

  // End of test
}
