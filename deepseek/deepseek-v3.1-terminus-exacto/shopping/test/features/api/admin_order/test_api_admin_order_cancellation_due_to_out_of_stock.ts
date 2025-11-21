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
 * Test administrator cancelling customer order due to inventory shortages.
 *
 * This comprehensive E2E test validates the complete workflow of order
 * cancellation by an administrator when products are unavailable. The test
 * involves creating both customer and administrator accounts, placing an order
 * as a customer, then switching to admin context to cancel the order due to
 * stock issues.
 */
export async function test_api_admin_order_cancellation_due_to_out_of_stock(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({
        can_manage_orders: true,
        can_cancel_orders: true,
      }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPassword123!";

  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerAuth);

  // 3. Create an order as customer
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, ${RandomGenerator.paragraph({ sentences: 5 })}`,
        billing_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, ${RandomGenerator.paragraph({ sentences: 5 })}`,
        items: ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () =>
            ({
              shopping_mall_product_variant_id: typia.random<
                string & tags.Format<"uuid">
              >(),
              quantity: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
              >(),
            }) satisfies IShoppingMallOrderItem.ICreate,
        ),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Switch to admin authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shoppingmall.example.com/admin",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // 5. Admin cancels the order due to inventory shortages
  const updatedOrder = await api.functional.shoppingMall.admin.orders.update(
    connection,
    {
      orderId: order.id,
      body: {
        status: "cancelled",
      } satisfies IShoppingMallOrder.IUpdate,
    },
  );
  typia.assert(updatedOrder);

  // 6. Validate that order status was updated to cancelled
  TestValidator.equals(
    "order status should be cancelled",
    updatedOrder.status,
    "cancelled",
  );
  TestValidator.equals(
    "order ID should remain the same",
    updatedOrder.id,
    order.id,
  );
  TestValidator.equals(
    "order number should remain the same",
    updatedOrder.order_number,
    order.order_number,
  );
  TestValidator.equals(
    "customer should remain the same",
    updatedOrder.customer.id,
    order.customer.id,
  );

  // 7. Validate that other order details remain unchanged
  TestValidator.equals(
    "total amount should remain unchanged",
    updatedOrder.total_amount,
    order.total_amount,
  );
  TestValidator.equals(
    "subtotal amount should remain unchanged",
    updatedOrder.subtotal_amount,
    order.subtotal_amount,
  );
  TestValidator.equals(
    "tax amount should remain unchanged",
    updatedOrder.tax_amount,
    order.tax_amount,
  );
  TestValidator.equals(
    "shipping amount should remain unchanged",
    updatedOrder.shipping_amount,
    order.shipping_amount,
  );
  TestValidator.equals(
    "currency should remain unchanged",
    updatedOrder.currency,
    order.currency,
  );
  TestValidator.equals(
    "shipping address should remain unchanged",
    updatedOrder.shipping_address,
    order.shipping_address,
  );
  TestValidator.equals(
    "billing address should remain unchanged",
    updatedOrder.billing_address,
    order.billing_address,
  );
}
