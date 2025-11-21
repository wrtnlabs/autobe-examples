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
 * Test administrator updating shipping address for customer order before
 * shipment processing. This comprehensive E2E test validates the complete
 * workflow of admin authentication, customer order creation, and shipping
 * address modification before shipment processing.
 */
export async function test_api_admin_order_shipping_address_update_before_shipment(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: "Admin",
      last_name: "User",
      role: "support_admin",
      permissions: JSON.stringify({ access_level: "full" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create customer account and authenticate
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPassword123!";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: "John",
      last_name: "Doe",
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 3: Customer creates an order with initial shipping address
  const initialShippingAddress =
    "123 Main St, Anytown, CA 12345, United States";
  const initialBillingAddress = "123 Main St, Anytown, CA 12345, United States";

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: initialShippingAddress,
        billing_address: initialBillingAddress,
        items: [
          {
            shopping_mall_product_variant_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 4: Switch to admin authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shoppingmall.example.com/admin",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 5: Admin updates shipping address before shipment
  const updatedShippingAddress =
    "456 Oak Avenue, Springfield, IL 62701, United States";

  const updatedOrder = await api.functional.shoppingMall.admin.orders.update(
    connection,
    {
      orderId: order.id,
      body: {
        shipping_address: updatedShippingAddress,
      } satisfies IShoppingMallOrder.IUpdate,
    },
  );
  typia.assert(updatedOrder);

  // Step 6: Validate address update was successful
  TestValidator.equals(
    "shipping address should be updated",
    updatedOrder.shipping_address,
    updatedShippingAddress,
  );

  TestValidator.notEquals(
    "shipping address should differ from original",
    updatedOrder.shipping_address,
    initialShippingAddress,
  );

  // Step 7: Validate other order properties remain unchanged
  TestValidator.equals(
    "order ID should remain the same",
    updatedOrder.id,
    order.id,
  );

  TestValidator.equals(
    "customer should remain the same",
    updatedOrder.customer.id,
    order.customer.id,
  );

  TestValidator.equals(
    "order total amount should remain unchanged",
    updatedOrder.total_amount,
    order.total_amount,
  );

  // Step 8: Validate order status remains appropriate for address modification
  TestValidator.predicate(
    "order status should allow address modification",
    updatedOrder.status === "pending" || updatedOrder.status === "confirmed",
  );
}
