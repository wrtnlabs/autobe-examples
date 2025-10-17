import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatus";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test updating order status operations by an admin user.
 *
 * This scenario covers the full lifecycle of order status changes managed by an
 * admin on the shopping mall platform. It includes sequence of actions:
 *
 * 1. Admin user registers via join and logs in to authenticate.
 * 2. Customer user is created who will place orders.
 * 3. Seller user is created who represents product owner.
 * 4. Customer creates a shopping order with association to customer and seller.
 * 5. Admin updates the order status sequentially through valid lifecycle values:
 *    'pending_payment', 'paid', 'shipped'.
 * 6. Each update operation returns a status record verified against the type
 *    IShoppingMallOrderStatus.
 * 7. All responses are asserted with typia.assert for type safety.
 * 8. The test validates the role-based authorization, data integrity, and
 *    lifecycle workflows.
 */
export async function test_api_order_status_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registers via join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin user logs in again to authenticate and set token
  const adminLogged: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        type: "admin",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLogged);

  // 3. Create a customer user
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "CustPass123!",
    nickname: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerBody,
    });
  typia.assert(customer);

  // 4. Create a seller user
  const sellerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "SellerPass123!",
    company_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerBody,
    });
  typia.assert(seller);

  // 5. Customer creates an order
  const orderBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: `ORDER-${Date.now()}-${RandomGenerator.alphaNumeric(5)}`,
    total_price: 50000,
    status: "pending_payment",
    business_status: "pending",
    payment_method: "credit_card",
    shipping_address: "123 Test Street, Seoul, South Korea",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // Status update lifecycle sequence
  const statuses = [
    { status: "pending_payment", description: "Initial status" },
    { status: "paid", description: "Payment confirmed" },
    { status: "shipped", description: "Order shipped" },
  ] as const;

  // 6. Admin updates the order status sequentially
  for (const stage of statuses) {
    const updateBody = {
      status: stage.status,
      status_changed_at: new Date().toISOString(),
    } satisfies IShoppingMallOrderStatus.IUpdate;

    const updatedStatus: IShoppingMallOrderStatus =
      await api.functional.shoppingMall.admin.orders.statuses.updateStatus(
        connection,
        {
          orderId: order.id,
          body: updateBody,
        },
      );
    typia.assert(updatedStatus);

    TestValidator.equals(
      `order status updated to ${stage.status}`,
      updatedStatus.status,
      stage.status,
    );
    TestValidator.equals(
      `order ID matches after status update to ${stage.status}`,
      updatedStatus.shopping_mall_order_id,
      order.id,
    );
  }
}
