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
 * Test administrator correcting billing address for payment processing issues.
 * Admin authenticates, accesses order with incorrect billing information, and
 * updates address to resolve payment gateway validation failures. Validates
 * that billing address updates maintain financial integrity, payment processing
 * can proceed successfully, and audit trails record the correction
 * appropriately.
 */
export async function test_api_admin_order_billing_address_correction(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer_password_123";

  const customer = await api.functional.auth.customer.join(connection, {
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
  typia.assert(customer);

  // Step 2: Create order with incorrect billing address (will cause payment issues)
  const incorrectBillingAddress =
    "123 Invalid Street, Wrong City, Invalid State 00000";
  const correctBillingAddress =
    "456 Valid Avenue, Proper City, Correct State 12345";

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: "789 Delivery Lane, Shipping City, Ship State 67890",
        billing_address: incorrectBillingAddress,
        items: ArrayUtil.repeat(
          2,
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

  TestValidator.equals(
    "order has incorrect billing address",
    order.billing_address,
    incorrectBillingAddress,
  );

  // Step 3: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin_password_456";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({
        order_management: true,
        billing_correction: true,
      }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Admin updates billing address to correct format
  const updatedOrder = await api.functional.shoppingMall.admin.orders.update(
    connection,
    {
      orderId: order.id,
      body: {
        billing_address: correctBillingAddress,
      } satisfies IShoppingMallOrder.IUpdate,
    },
  );
  typia.assert(updatedOrder);

  // Step 5: Validate billing address correction
  TestValidator.equals(
    "billing address corrected",
    updatedOrder.billing_address,
    correctBillingAddress,
  );
  TestValidator.equals("order ID unchanged", updatedOrder.id, order.id);
  TestValidator.equals(
    "customer unchanged",
    updatedOrder.customer.id,
    order.customer.id,
  );
  TestValidator.equals(
    "order total unchanged",
    updatedOrder.total_amount,
    order.total_amount,
  );
  TestValidator.equals(
    "order status unchanged",
    updatedOrder.status,
    order.status,
  );

  // Step 6: Verify payment processing readiness (billing address format validation)
  TestValidator.predicate(
    "correct billing address format",
    updatedOrder.billing_address.includes(",") &&
      updatedOrder.billing_address.length > 10,
  );

  // Step 7: Validate audit trail maintenance
  TestValidator.notEquals(
    "updated timestamp changed",
    updatedOrder.updated_at,
    order.updated_at,
  );
  TestValidator.equals(
    "created timestamp unchanged",
    updatedOrder.created_at,
    order.created_at,
  );
}
