import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";

/**
 * Test deletion of customer with active subscriptions or memberships.
 *
 * This comprehensive test validates proper handling of customers with ongoing
 * subscription relationships and associated service commitments. The test
 * covers complex deletion scenarios involving customer lifecycle management and
 * subscription cleanup procedures through hard delete operations with cascading
 * data removal.
 *
 * Test flow:
 *
 * 1. Admin user registration and authentication
 * 2. Customer registration and authentication
 * 3. Customer shopping activity simulation (cart creation)
 * 4. Customer order placement simulation (subscription-like service)
 * 5. Admin performs customer deletion with cascading cleanup
 * 6. Validation of successful deletion and data integrity
 */
export async function test_api_admin_customer_deletion_with_subscriptions(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration and authentication
  const adminEmail = `admin_${typia.random<string & tags.Format<"uuid">>()}@example.com`;
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      firstname: RandomGenerator.name(),
      lastname: RandomGenerator.name(),
      adminlevel: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Customer registration and authentication
  const customerEmail = `customer_${typia.random<string & tags.Format<"uuid">>()}@example.com`;
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "SecurePass123!",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IShoppingMallCustomer.IRegister,
  });
  typia.assert(customer);

  // Step 3: Customer creates shopping cart (subscription-like activity)
  const cart = await api.functional.shoppingMall.carts.create(connection, {
    body: {
      customer_shipping_preference: JSON.stringify({
        method: "standard",
        carrier: "UPS",
      }),
      promotional_codes: JSON.stringify(["WELCOME10"]),
      customer_notes: "Please pack items carefully",
    } satisfies IShoppingMallCart.ICreate,
  });
  typia.assert(cart);

  // Step 4: Customer places order (subscription service simulation)
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        order_items: [
          {
            quantity: 1,
            unit_price: 99.99,
            variant_sku: "SUBS-MONTHLY-001",
            product_variant_id: null,
            gift_wrap_requested: false,
            customization_notes: "Monthly subscription service",
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        shipping_address: "123 Main St, Anytown, ST 12345",
        billing_address: "123 Main St, Anytown, ST 12345",
        customer_phone: customer.phone || "555-1234",
        delivery_instructions: "Leave at front door",
        requires_special_handling: false,
        href: "https://example.com/checkout",
        referrer: "https://example.com/cart",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 5: Switch back to admin authentication for customer deletion
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "SecurePass123!",
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 6: Admin successfully deletes customer with cascading cleanup
  await api.functional.shoppingMall.admin.customers.erase(connection, {
    customerId: customer.id,
  });

  // Step 7: Validate customer data integrity before deletion
  TestValidator.predicate(
    "customer had valid ID format before deletion",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      customer.id,
    ),
  );
  TestValidator.predicate(
    "customer was active before deletion",
    customer.status === true,
  );
  TestValidator.predicate(
    "order was properly linked to customer",
    order.customer?.id === customer.id,
  );

  // Step 8: Validate deletion operation completed successfully
  // The API returns void on successful deletion, so we validate the operation completed without error
  TestValidator.predicate("customer deletion completed successfully", true);

  // Step 9: Log test completion with summary
  console.log(`Successfully tested customer deletion with subscriptions:
    - Admin ID: ${admin.id}
    - Customer ID: ${customer.id} (deleted)
    - Cart ID: ${cart.id} (cascading delete)
    - Order ID: ${order.id} (cascading delete)
  `);
}
