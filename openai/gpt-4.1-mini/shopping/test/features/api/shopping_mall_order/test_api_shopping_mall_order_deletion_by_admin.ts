import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

export async function test_api_shopping_mall_order_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin account creation
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
    ip: null,
    href: "http://localhost",
    referrer: "http://localhost",
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAccount = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAccount);

  // 2. Admin login
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "http://localhost",
    referrer: "http://localhost",
  } satisfies IShoppingMallAdmin.ILogin;
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 3. Customer account creation
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
    href: "http://localhost",
    referrer: "http://localhost",
  } satisfies IShoppingMallCustomer.ICreate;
  const customerAccount = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customerAccount);

  // 4. Customer login
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "http://localhost",
    referrer: "http://localhost",
  } satisfies IShoppingMallCustomer.ILogin;
  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  // 5. Create an order by customer
  // Use order_number, order_status, payment_status, total_amount, shipping_address according to schema
  const newOrderBody = {
    order_number: `ORD-${Date.now()}`,
    order_status: "pending",
    payment_status: "unpaid",
    total_amount: 10000,
    shipping_address: "123 Test Street, Test City, Test Country",
  } satisfies IShoppingMallOrder.ICreate;
  const createdOrder = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: newOrderBody },
  );
  typia.assert(createdOrder);

  // 6. Switch back to Admin login to perform deletion
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 7. Delete the created order by admin
  await api.functional.shoppingMall.admin.orders.erase(connection, {
    orderId: createdOrder.id,
  });

  // 8. Confirm deletion by trying to delete again or checking (if possible)
  // As there is no read API and no explicit confirmation API for order, test only for error on second deletion
  await TestValidator.error(
    "deleting a non-existent order should fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.erase(connection, {
        orderId: createdOrder.id,
      });
    },
  );
}
