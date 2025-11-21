import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test cart retrieval with configured shipping method and cost estimates,
 * validating that shipping preferences are properly displayed to customers.
 * Ensures that selected shipping methods, estimated delivery times, and
 * calculated shipping costs are accurately reflected in the cart details view.
 */
export async function test_api_cart_retrieval_with_shipping_preferences(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      first_name: RandomGenerator.paragraph({ sentences: 2 }),
      last_name: RandomGenerator.paragraph({ sentences: 2 }),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com/home",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create shopping cart session
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 3: Configure shipping preferences before retrieval test
  const shippingMethods = [
    "standard",
    "express",
    "overnight",
    "international",
  ] as const;
  const selectedShippingMethod = RandomGenerator.pick(shippingMethods);
  const estimatedShippingCost = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<300> & tags.Maximum<10000>
  >();

  const updatedCart = await api.functional.shoppingMall.customer.carts.update(
    connection,
    {
      cartId: cart.id,
      body: {
        shipping_method: selectedShippingMethod,
        estimated_shipping_cost: estimatedShippingCost,
      } satisfies IShoppingMallCart.IUpdate,
    },
  );
  typia.assert(updatedCart);

  // Step 4: Retrieve cart and validate shipping preferences
  const retrievedCart = await api.functional.shoppingMall.customer.carts.at(
    connection,
    {
      cartId: cart.id,
    },
  );
  typia.assert(retrievedCart);

  // Validate cart identity
  TestValidator.equals("cart ID should match", retrievedCart.id, cart.id);

  // Validate shipping method configuration
  TestValidator.equals(
    "shipping method should be set",
    retrievedCart.shipping_method,
    selectedShippingMethod,
  );

  // Validate shipping cost estimate
  TestValidator.equals(
    "estimated shipping cost should match",
    retrievedCart.estimated_shipping_cost,
    estimatedShippingCost,
  );

  // Validate customer session ownership
  TestValidator.equals(
    "customer session ID should match",
    retrievedCart.shopping_mall_customer_session_id,
    customer.id,
  );

  // Validate cart status
  TestValidator.equals("cart should be active", retrievedCart.status, "active");

  // Validate timestamps
  TestValidator.predicate(
    "created_at should be valid date",
    new Date(retrievedCart.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    new Date(retrievedCart.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "expires_at should be valid date",
    new Date(retrievedCart.expires_at).getTime() > 0,
  );

  // Validate timestamp ordering
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(retrievedCart.updated_at).getTime() >=
      new Date(retrievedCart.created_at).getTime(),
  );
}
