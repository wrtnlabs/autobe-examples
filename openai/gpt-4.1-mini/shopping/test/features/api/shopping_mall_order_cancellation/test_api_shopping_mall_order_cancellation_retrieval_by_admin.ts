import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";

export async function test_api_shopping_mall_order_cancellation_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
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

  // 2. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPassword123!";
  const customerCreateBody = {
    email: customerEmail,
    password: customerPassword,
    full_name: RandomGenerator.name(),
    href: "http://localhost/signup",
    referrer: "http://localhost/home",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 3. Customer login to ensure authentication context
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "http://localhost/login",
      referrer: "http://localhost/home",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customerLogin);

  // 4. Customer creates a shopping mall order
  const orderCreateBody = {
    order_number: `ORD-${RandomGenerator.alphaNumeric(8)}`,
    status: "pending",
    payment_status: "pending",
    total_amount: Math.floor(Math.random() * 90000 + 10000) / 100,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: orderCreateBody,
      },
    );
  typia.assert(order);

  // 5. Customer creates an order cancellation request
  const cancellationCreateBody = {
    shopping_mall_order_id: order.id,
    reason: "Changed mind",
    status: "pending",
  } satisfies IShoppingMallOrderCancellation.ICreate;
  const cancellation: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.customer.shoppingMallOrderCancellations.create(
      connection,
      {
        body: cancellationCreateBody,
      },
    );
  typia.assert(cancellation);

  // 6. Admin login to establish admin authentication context
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost/admin/login",
      referrer: "http://localhost/admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 7. Admin retrieves the specific order cancellation
  const retrievedCancellation: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.admin.shoppingMallOrderCancellations.at(
      connection,
      {
        shoppingMallOrderCancellationId: cancellation.id,
      },
    );
  typia.assert(retrievedCancellation);

  // 8. Validate retrieved cancellation data matches created cancellation
  TestValidator.equals(
    "retrieved cancellation ID matches created",
    retrievedCancellation.id,
    cancellation.id,
  );
  TestValidator.equals(
    "retrieved cancellation's order ID matches created",
    retrievedCancellation.shopping_mall_order_id,
    cancellation.shopping_mall_order_id,
  );
  TestValidator.equals(
    "retrieved cancellation's customer ID matches created",
    retrievedCancellation.shopping_mall_customer_id,
    cancellation.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "retrieved cancellation reason matches created",
    retrievedCancellation.reason,
    cancellation.reason,
  );
  TestValidator.equals(
    "retrieved cancellation status matches created",
    retrievedCancellation.status,
    cancellation.status,
  );
  TestValidator.predicate(
    "retrieved cancellation timestamps non-empty",
    typeof retrievedCancellation.created_at === "string" &&
      retrievedCancellation.created_at.length > 0 &&
      typeof retrievedCancellation.updated_at === "string" &&
      retrievedCancellation.updated_at.length > 0,
  );
  TestValidator.predicate(
    "retrieved cancellation deleted_at is null or string",
    retrievedCancellation.deleted_at === null ||
      typeof retrievedCancellation.deleted_at === "string",
  );
}
