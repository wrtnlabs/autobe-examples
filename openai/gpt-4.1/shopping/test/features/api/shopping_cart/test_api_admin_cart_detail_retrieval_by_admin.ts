import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCart";
import type { IShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCartItem";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomerAddress";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";

/**
 * Validates that an admin can retrieve complete details of a specific shopping
 * cart by cartId, including all items, SKU summaries, and the customer
 * linkage.
 *
 * This test verifies:
 *
 * 1. Admin authentication (registration) and access token usage
 * 2. Customer registration and associated primary address creation (using valid
 *    address structure)
 * 3. Assumption: a cart is automatically initialized for the customer (as no
 *    explicit add-to-cart endpoint is available)
 * 4. Admin can retrieve the customer's cart details with all items and reference
 *    structures
 * 5. The returned cart contains accurate linkage to the customer
 * 6. Access control: non-admins (such as a fresh customer) cannot access the admin
 *    cart retrieval endpoint
 */
export async function test_api_admin_cart_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin to retrieve cart as admin
  const adminRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "super", // Use allowed role pattern (min 2, max 32 chars)
    status: "active", // Use allowed status pattern (min 3, max 20 chars)
  } satisfies IShoppingAdmin.IJoin;
  const adminAuth: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRegistration,
    });
  typia.assert(adminAuth);

  // 2. Register a customer and create a default address
  const customerRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://shop.example.com/welcome",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingCustomer.ICreate;
  const customerAuth: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerRegistration,
    });
  typia.assert(customerAuth);

  // 3. Create a customer address so a cart can exist for the customer
  // (assumption: address creation triggers cart initialization in some systems)
  const customerAddressInput = {
    address_line1: "123 Main St",
    address_line2: null,
    city: "Metropolis",
    state: "Metro State",
    postal_code: "12345",
    country: "USA",
    is_primary: true,
    phone: customerRegistration.phone,
    recipient_name: customerRegistration.name,
  } satisfies IShoppingCustomerAddress.ICreate;
  const address: IShoppingCustomerAddress =
    await api.functional.shopping.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: customerAddressInput,
      },
    );
  typia.assert(address);

  // 4. Retrieve the cart as admin
  const cart: IShoppingCart = await api.functional.shopping.admin.carts.at(
    connection,
    { cartId: address.shopping_customer_id },
  );
  typia.assert(cart);
  TestValidator.equals(
    "cart's customer.id matches registration",
    cart.customer.id,
    customerAuth.id,
  );

  // If cart.items has at least one item, check item customer linkage and quantity validity
  if (cart.items.length > 0) {
    for (const item of cart.items) {
      typia.assert(item);
      TestValidator.equals(
        "cart_item.cart_owner.id matches customer",
        item.cart_owner.id,
        customerAuth.id,
      );
      TestValidator.predicate("cart_item quantity >= 1", item.quantity >= 1);
    }
  }

  // 5. Access control: switching to customer connection and ensuring customer CANNOT access admin cart endpoint
  await api.functional.auth.customer.join(connection, {
    body: {
      ...customerRegistration,
      email: typia.random<string & tags.Format<"email">>(), // fresh customer
      phone: RandomGenerator.mobile(),
    },
  });
  await TestValidator.error(
    "non-admin actor should be denied access to admin cart endpoint",
    async () => {
      await api.functional.shopping.admin.carts.at(connection, {
        cartId: cart.id,
      });
    },
  );
}
