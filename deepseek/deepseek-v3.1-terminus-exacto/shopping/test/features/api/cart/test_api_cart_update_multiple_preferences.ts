import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test comprehensive cart updates that modify multiple preferences
 * simultaneously, including shipping method changes, coupon applications, and
 * status transitions. Validates that complex cart modifications are handled
 * correctly and that all preferences are properly synchronized and persisted.
 */
export async function test_api_cart_update_multiple_preferences(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "TestPassword123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://test-shopping-mall.com/register",
      referrer: "https://test-shopping-mall.com/",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create initial shopping cart session
  const initialCart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id,
        shipping_method: "standard",
        applied_coupon_code: undefined,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(initialCart);

  // Step 3: Perform comprehensive cart updates with multiple preference changes
  const updatedCart = await api.functional.shoppingMall.customer.carts.update(
    connection,
    {
      cartId: initialCart.id,
      body: {
        status: "active",
        shipping_method: "express",
        applied_coupon_code: "SUMMER2024",
        estimated_shipping_cost: 15.99,
      } satisfies IShoppingMallCart.IUpdate,
    },
  );
  typia.assert(updatedCart);

  // Step 4: Validate comprehensive update results
  TestValidator.equals(
    "cart ID remains consistent after updates",
    updatedCart.id,
    initialCart.id,
  );

  TestValidator.equals(
    "shipping method updated correctly",
    updatedCart.shipping_method,
    "express",
  );

  TestValidator.equals(
    "coupon code applied successfully",
    updatedCart.applied_coupon_code,
    "SUMMER2024",
  );

  TestValidator.equals(
    "estimated shipping cost updated",
    updatedCart.estimated_shipping_cost,
    15.99,
  );

  TestValidator.equals(
    "cart status maintained as active",
    updatedCart.status,
    "active",
  );

  TestValidator.equals(
    "customer session ID remains unchanged",
    updatedCart.shopping_mall_customer_session_id,
    initialCart.shopping_mall_customer_session_id,
  );

  // Step 5: Validate timestamp updates
  TestValidator.notEquals(
    "updated_at timestamp should change after modifications",
    updatedCart.updated_at,
    initialCart.updated_at,
  );

  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedCart.created_at,
    initialCart.created_at,
  );

  // Step 6: Validate cart expiration logic
  TestValidator.predicate(
    "cart should have valid expiration timestamp",
    new Date(updatedCart.expires_at) > new Date(),
  );
}
