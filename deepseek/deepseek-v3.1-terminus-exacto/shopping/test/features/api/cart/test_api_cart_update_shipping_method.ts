import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test that customers can update their shopping cart shipping method
 * preferences and verify that shipping cost estimates are recalculated
 * correctly.
 *
 * This test validates the business logic for shipping method selection, cost
 * calculation updates, and preference persistence across cart modifications. It
 * follows a complete customer journey from account creation to cart
 * management.
 */
export async function test_api_cart_update_shipping_method(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.paragraph({ sentences: 2 }),
      last_name: RandomGenerator.paragraph({ sentences: 1 }),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create initial shopping cart with default shipping method
  const initialCart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id,
        shipping_method: "standard",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(initialCart);
  TestValidator.equals(
    "initial cart should have standard shipping method",
    initialCart.shipping_method,
    "standard",
  );

  // Step 3: Update cart with express shipping method
  const expressCartUpdate =
    await api.functional.shoppingMall.customer.carts.update(connection, {
      cartId: initialCart.id,
      body: {
        shipping_method: "express",
        estimated_shipping_cost: 15.99,
      } satisfies IShoppingMallCart.IUpdate,
    });
  typia.assert(expressCartUpdate);
  TestValidator.equals(
    "cart shipping method should be updated to express",
    expressCartUpdate.shipping_method,
    "express",
  );
  TestValidator.equals(
    "shipping cost should be updated",
    expressCartUpdate.estimated_shipping_cost,
    15.99,
  );

  // Step 4: Update cart with overnight shipping method
  const overnightCartUpdate =
    await api.functional.shoppingMall.customer.carts.update(connection, {
      cartId: initialCart.id,
      body: {
        shipping_method: "overnight",
        estimated_shipping_cost: 29.99,
      } satisfies IShoppingMallCart.IUpdate,
    });
  typia.assert(overnightCartUpdate);
  TestValidator.equals(
    "cart shipping method should be updated to overnight",
    overnightCartUpdate.shipping_method,
    "overnight",
  );
  TestValidator.equals(
    "shipping cost should be updated to overnight rate",
    overnightCartUpdate.estimated_shipping_cost,
    29.99,
  );

  // Step 5: Remove shipping method (set to null)
  const noShippingCartUpdate =
    await api.functional.shoppingMall.customer.carts.update(connection, {
      cartId: initialCart.id,
      body: {
        shipping_method: null,
        estimated_shipping_cost: undefined,
      } satisfies IShoppingMallCart.IUpdate,
    });
  typia.assert(noShippingCartUpdate);
  TestValidator.equals(
    "shipping method should be removed",
    noShippingCartUpdate.shipping_method,
    undefined,
  );
  TestValidator.equals(
    "shipping cost should be undefined",
    noShippingCartUpdate.estimated_shipping_cost,
    undefined,
  );

  // Step 6: Verify cart status remains active throughout updates
  TestValidator.equals(
    "cart status should remain active",
    noShippingCartUpdate.status,
    "active",
  );
  TestValidator.equals(
    "cart ID should remain consistent",
    noShippingCartUpdate.id,
    initialCart.id,
  );
  TestValidator.equals(
    "customer session ID should remain consistent",
    noShippingCartUpdate.shopping_mall_customer_session_id,
    customer.id,
  );
}
