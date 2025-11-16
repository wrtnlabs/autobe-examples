import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";

export async function test_api_admin_create_order_cancellation_request(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "AdminPass123!",
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin user login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Customer user registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "CustomerPass123!",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://customer.example.com/join",
        referrer: "https://customer.example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Customer user login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "CustomerPass123!",
      ip: null,
      href: "https://customer.example.com/login",
      referrer: "https://customer.example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 5. Create an order as the authenticated customer
  const orderBody = {
    order_number: `ORD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    status: "pending",
    payment_status: "pending",
    total_amount: 10000,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: orderBody,
      },
    );
  typia.assert(order);

  // 6. Admin creates an order cancellation request for the created order
  const cancellationBody = {
    shopping_mall_order_id: order.id,
    reason: "Customer requested cancellation due to change of mind",
    status: "pending",
  } satisfies IShoppingMallOrderCancellation.ICreate;

  const cancellation: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.admin.shoppingMallOrderCancellations.create(
      connection,
      {
        body: cancellationBody,
      },
    );
  typia.assert(cancellation);

  // Validation checks
  TestValidator.equals(
    "Cancellation status should be pending",
    cancellation.status,
    "pending",
  );
  TestValidator.equals(
    "Cancellation references the correct order",
    cancellation.shopping_mall_order_id,
    order.id,
  );
}
