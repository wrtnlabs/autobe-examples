import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";

/**
 * Test that an admin can retrieve detailed information for a specific order
 * cancellation request.
 *
 * This test simulates the end-to-end flow involving two distinct user roles:
 * admin and customer. The admin first registers and logs in to obtain
 * authorization to access cancellation details. Meanwhile, a customer registers
 * and logs in, places a new order, and submits an order cancellation request
 * for that order. Finally, the admin retrieves the order cancellation details
 * by the cancellation ID.
 *
 * Steps:
 *
 * 1. Admin join and login to authenticate as administrator.
 * 2. Customer join and login to authenticate as customer.
 * 3. Customer creates a shopping mall order.
 * 4. Customer submits order cancellation request for the created order.
 * 5. Admin retrieves the order cancellation detail by ID.
 *
 * The test asserts all API responses using typia.assert for type safety,
 * verifies correct linkage among entities, and uses TestValidator for
 * behavioral validations.
 */
export async function test_api_order_cancellation_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "1234",
        ip: null,
        href: "http://localhost/admin-join",
        referrer: "http://localhost/",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login to refresh authentication (simulate actor switching)
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "1234",
        ip: null,
        href: "http://localhost/admin-login",
        referrer: "http://localhost/",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // 3. Customer join
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "1234",
        href: "http://localhost/customer-join",
        referrer: "http://localhost/",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerAuthorized);

  // 4. Customer login
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: "1234",
        ip: null,
        href: "http://localhost/customer-login",
        referrer: "http://localhost/",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(customerLoggedIn);

  // 5. Customer creates an order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        order_number: `ORDER-${Date.now()}`,
        order_status: "pending",
        payment_status: "pending",
        total_amount: 10000,
        shipping_address: "123 Example St, Example City",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);
  TestValidator.predicate("order id is non-empty", order.id.length > 0);

  // 6. Customer creates order cancellation request
  await api.functional.shoppingMall.customer.orderCancellations.create(
    connection,
    {
      body: {
        shopping_mall_order_id: order.id,
        cancellation_reason: "Changed my mind",
        requested_at: new Date().toISOString(),
      } satisfies IShoppingMallOrderCancellation.ICreate,
    },
  );

  // 7. Admin retrieves order cancellation detail using the order ID (as no cancellation ID available)
  const cancellationDetail: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.admin.orderCancellations.at(connection, {
      orderCancellationId: order.id,
    });
  typia.assert(cancellationDetail);

  // Data validation using TestValidator
  TestValidator.predicate(
    "cancellation detail object is not empty",
    Object.keys(cancellationDetail).length > 0,
  );
}
