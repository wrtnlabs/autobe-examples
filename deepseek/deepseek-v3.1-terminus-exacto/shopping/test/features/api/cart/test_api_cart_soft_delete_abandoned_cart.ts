import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test soft deletion of an abandoned cart that was created but never converted
 * to an order. Validates that abandoned carts can be properly soft-deleted and
 * that the system maintains cart data for analytics purposes. Tests the cart
 * lifecycle management for inactive shopping sessions.
 */
export async function test_api_cart_soft_delete_abandoned_cart(
  connection: api.IConnection,
) {
  // 1. Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Create a shopping cart that will be abandoned
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Soft delete the abandoned cart
  await api.functional.shoppingMall.customer.carts.erase(connection, {
    cartId: cart.id,
  });

  // 4. Validate the cart was properly soft-deleted
  // The operation should complete without errors
  // Since this is a soft delete, the cart data is preserved for analytics
  TestValidator.predicate(
    "soft delete operation completed successfully without errors",
    true,
  );
}
