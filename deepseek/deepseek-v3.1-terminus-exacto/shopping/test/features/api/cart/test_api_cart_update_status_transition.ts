import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test cart status transitions from active to abandoned or converted states,
 * validating that proper lifecycle management is enforced. Ensures that status
 * changes follow valid transitions and that cart behavior is appropriate for
 * each status state during shopping session management.
 */
export async function test_api_cart_update_status_transition(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create shopping cart session with initial active status
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Validate initial cart state
  TestValidator.equals(
    "cart should have active status initially",
    cart.status,
    "active",
  );
  TestValidator.equals(
    "cart should belong to the created customer",
    cart.shopping_mall_customer_session_id,
    customer.id,
  );
  TestValidator.predicate(
    "cart should have creation timestamp",
    cart.created_at !== null && cart.created_at !== undefined,
  );
  TestValidator.predicate(
    "cart should have expiration timestamp",
    cart.expires_at !== null && cart.expires_at !== undefined,
  );

  // Step 3: Update cart status to abandoned state and validate transition
  const abandonedCart = await api.functional.shoppingMall.customer.carts.update(
    connection,
    {
      cartId: cart.id,
      body: {
        status: "abandoned",
      } satisfies IShoppingMallCart.IUpdate,
    },
  );
  typia.assert(abandonedCart);

  TestValidator.equals(
    "cart status should be abandoned",
    abandonedCart.status,
    "abandoned",
  );
  TestValidator.equals(
    "cart ID should remain unchanged",
    abandonedCart.id,
    cart.id,
  );
  TestValidator.equals(
    "customer session ID should remain unchanged",
    abandonedCart.shopping_mall_customer_session_id,
    customer.id,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after status update",
    abandonedCart.updated_at,
    cart.updated_at,
  );

  // Step 4: Test updating cart properties while maintaining abandoned status
  const updatedAbandonedCart =
    await api.functional.shoppingMall.customer.carts.update(connection, {
      cartId: cart.id,
      body: {
        shipping_method: "standard",
        applied_coupon_code: "WELCOME10",
        estimated_shipping_cost: 9.99,
      } satisfies IShoppingMallCart.IUpdate,
    });
  typia.assert(updatedAbandonedCart);

  TestValidator.equals(
    "cart status should remain abandoned during property update",
    updatedAbandonedCart.status,
    "abandoned",
  );
  TestValidator.equals(
    "shipping method should be set",
    updatedAbandonedCart.shipping_method,
    "standard",
  );
  TestValidator.equals(
    "coupon code should be applied",
    updatedAbandonedCart.applied_coupon_code,
    "WELCOME10",
  );
  TestValidator.equals(
    "shipping cost should be estimated",
    updatedAbandonedCart.estimated_shipping_cost,
    9.99,
  );

  // Step 5: Test converting abandoned cart to converted state
  const convertedCart = await api.functional.shoppingMall.customer.carts.update(
    connection,
    {
      cartId: cart.id,
      body: {
        status: "converted",
      } satisfies IShoppingMallCart.IUpdate,
    },
  );
  typia.assert(convertedCart);

  TestValidator.equals(
    "cart status should be converted",
    convertedCart.status,
    "converted",
  );
  TestValidator.equals(
    "cart ID should remain unchanged",
    convertedCart.id,
    cart.id,
  );
  TestValidator.equals(
    "customer session ID should remain unchanged",
    convertedCart.shopping_mall_customer_session_id,
    customer.id,
  );

  // Step 6: Test that converted cart maintains its properties
  TestValidator.equals(
    "converted cart should retain shipping method",
    convertedCart.shipping_method,
    "standard",
  );
  TestValidator.equals(
    "converted cart should retain coupon code",
    convertedCart.applied_coupon_code,
    "WELCOME10",
  );
  TestValidator.equals(
    "converted cart should retain shipping cost",
    convertedCart.estimated_shipping_cost,
    9.99,
  );

  // Step 7: Test removing optional properties from converted cart
  const cleanedConvertedCart =
    await api.functional.shoppingMall.customer.carts.update(connection, {
      cartId: cart.id,
      body: {
        shipping_method: null,
        applied_coupon_code: null,
      } satisfies IShoppingMallCart.IUpdate,
    });
  typia.assert(cleanedConvertedCart);

  TestValidator.equals(
    "shipping method should be removed from converted cart",
    cleanedConvertedCart.shipping_method,
    null,
  );
  TestValidator.equals(
    "coupon code should be removed from converted cart",
    cleanedConvertedCart.applied_coupon_code,
    null,
  );
  TestValidator.equals(
    "cart status should remain converted",
    cleanedConvertedCart.status,
    "converted",
  );

  // Step 8: Validate cart lifecycle timestamps
  TestValidator.predicate(
    "created_at should be earliest timestamp",
    new Date(cart.created_at) <= new Date(cart.updated_at),
  );
  TestValidator.predicate(
    "expires_at should be in the future",
    new Date(cart.expires_at) > new Date(),
  );
}
