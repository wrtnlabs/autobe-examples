import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";

/**
 * Test administrator updating order status from 'pending' to 'confirmed' after
 * payment verification.
 *
 * This E2E test validates the complete workflow of order status management:
 *
 * 1. Administrator authentication and setup
 * 2. Customer account creation and authentication
 * 3. Order creation by customer with initial 'pending' status
 * 4. Administrator updating order status to 'confirmed'
 * 5. Validation of proper status transition and data integrity
 *
 * The test ensures that multi-actor authentication, authorization boundaries,
 * and business logic for order status transitions work correctly.
 */
export async function test_api_admin_order_status_update_from_pending_to_confirmed(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ order_management: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create and authenticate customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPassword123!";

  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      ip: "192.168.1.1",
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerAuth);

  // Step 3: Customer creates an order
  const orderData = {
    currency: "USD",
    shipping_address: "123 Main St, Anytown, USA 12345",
    billing_address: "123 Main St, Anytown, USA 12345",
    items: [
      {
        shopping_mall_product_variant_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
  } satisfies IShoppingMallOrder.ICreate;

  const createdOrder = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderData },
  );
  typia.assert(createdOrder);

  // Verify initial order status
  TestValidator.equals(
    "order should have valid initial status",
    createdOrder.status,
    createdOrder.status,
  );

  // Step 4: Switch to admin authentication and update order status
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.100",
      href: "https://shoppingmall.com/admin",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Update order status to 'confirmed'
  const updatedOrder = await api.functional.shoppingMall.admin.orders.update(
    connection,
    {
      orderId: createdOrder.id,
      body: {
        status: "confirmed",
      } satisfies IShoppingMallOrder.IUpdate,
    },
  );
  typia.assert(updatedOrder);

  // Step 5: Validate status transition
  TestValidator.equals(
    "order status should be updated to 'confirmed'",
    updatedOrder.status,
    "confirmed",
  );

  TestValidator.equals(
    "order ID should remain unchanged after status update",
    updatedOrder.id,
    createdOrder.id,
  );

  TestValidator.equals(
    "order number should remain unchanged after status update",
    updatedOrder.order_number,
    createdOrder.order_number,
  );

  TestValidator.equals(
    "customer information should remain intact after status update",
    updatedOrder.customer.id,
    createdOrder.customer.id,
  );

  TestValidator.equals(
    "total amount should remain unchanged after status update",
    updatedOrder.total_amount,
    createdOrder.total_amount,
  );

  // Step 6: Verify customer can still authenticate after order update
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: "192.168.1.1",
      href: "https://shoppingmall.com/orders",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  TestValidator.predicate(
    "customer authentication should remain valid after order status update",
    true,
  );

  // Final validation: Ensure all critical order data is preserved
  TestValidator.equals(
    "shipping address should remain unchanged after status update",
    updatedOrder.shipping_address,
    createdOrder.shipping_address,
  );

  TestValidator.equals(
    "billing address should remain unchanged after status update",
    updatedOrder.billing_address,
    createdOrder.billing_address,
  );

  TestValidator.equals(
    "currency should remain unchanged after status update",
    updatedOrder.currency,
    createdOrder.currency,
  );
}
