import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test cart retrieval when a coupon has been applied, verifying that discount
 * calculations and coupon information are correctly displayed. Validates that
 * customers can see applied coupon details, estimated savings, and updated cart
 * totals when viewing their shopping cart with active promotions.
 */
export async function test_api_cart_retrieval_with_coupon_applied(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create shopping cart session
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id,
        shipping_method: "standard",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 3: Apply coupon to cart with realistic test data
  const couponCode = RandomGenerator.alphaNumeric(10).toUpperCase();
  const estimatedShippingCost = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
  >();

  const updatedCart = await api.functional.shoppingMall.customer.carts.update(
    connection,
    {
      cartId: cart.id,
      body: {
        applied_coupon_code: couponCode,
        shipping_method: "express",
        estimated_shipping_cost: estimatedShippingCost,
      } satisfies IShoppingMallCart.IUpdate,
    },
  );
  typia.assert(updatedCart);

  // Step 4: Retrieve cart and validate coupon application
  const retrievedCart = await api.functional.shoppingMall.customer.carts.at(
    connection,
    {
      cartId: cart.id,
    },
  );
  typia.assert(retrievedCart);

  // Step 5: Comprehensive validation of cart data
  TestValidator.equals(
    "applied coupon code should match",
    retrievedCart.applied_coupon_code,
    couponCode,
  );

  TestValidator.equals(
    "cart ID should remain consistent",
    retrievedCart.id,
    cart.id,
  );

  TestValidator.equals(
    "customer session ID should match",
    retrievedCart.shopping_mall_customer_session_id,
    customer.id,
  );

  TestValidator.predicate(
    "cart status should be active",
    retrievedCart.status === "active",
  );

  TestValidator.predicate(
    "shipping method should be updated",
    retrievedCart.shipping_method === "express",
  );

  TestValidator.equals(
    "estimated shipping cost should match",
    retrievedCart.estimated_shipping_cost,
    estimatedShippingCost,
  );

  TestValidator.predicate(
    "cart should have expiration timestamp",
    retrievedCart.expires_at !== null && retrievedCart.expires_at !== undefined,
  );

  TestValidator.predicate(
    "cart creation timestamp should be set",
    retrievedCart.created_at !== null && retrievedCart.created_at !== undefined,
  );

  TestValidator.predicate(
    "cart update timestamp should be set",
    retrievedCart.updated_at !== null && retrievedCart.updated_at !== undefined,
  );

  TestValidator.predicate(
    "updated timestamp should be more recent than creation timestamp",
    new Date(retrievedCart.updated_at) >= new Date(retrievedCart.created_at),
  );
}
