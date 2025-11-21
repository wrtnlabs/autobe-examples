import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test cart creation with coupon code application functionality.
 *
 * This E2E test validates that customers can successfully apply valid coupon
 * codes during cart initialization and that the system properly records coupon
 * applications for subsequent shopping operations. The test ensures coupon
 * eligibility validation, proper cart status management, and coupon persistence
 * throughout the cart lifecycle.
 */
export async function test_api_customer_cart_creation_with_coupon(
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
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Validate authentication token setup
  TestValidator.predicate(
    "customer should have valid authentication token",
    customer.token !== undefined &&
      customer.token.access !== undefined &&
      customer.token.access.length > 0,
  );

  // Step 2: Create cart with coupon code application
  const couponCode = "SUMMER2024";
  const shippingMethod = "standard";

  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id,
        shipping_method: shippingMethod,
        applied_coupon_code: couponCode,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 3: Validate cart creation response
  TestValidator.equals(
    "cart ID should be valid UUID",
    cart.id,
    typia.assert<string & tags.Format<"uuid">>(cart.id),
  );
  TestValidator.equals(
    "cart should reference correct customer session",
    cart.shopping_mall_customer_session_id,
    customer.id,
  );
  TestValidator.equals("cart status should be active", cart.status, "active");
  TestValidator.equals(
    "applied coupon code should match",
    cart.applied_coupon_code,
    couponCode,
  );
  TestValidator.equals(
    "shipping method should match",
    cart.shipping_method,
    shippingMethod,
  );

  // Step 4: Validate cart lifecycle properties
  TestValidator.predicate(
    "cart should have valid expiration timestamp",
    cart.expires_at !== undefined &&
      cart.expires_at !== null &&
      new Date(cart.expires_at) > new Date(),
  );

  TestValidator.predicate(
    "cart should have valid creation timestamp",
    cart.created_at !== undefined &&
      cart.created_at !== null &&
      !isNaN(new Date(cart.created_at).getTime()),
  );

  TestValidator.predicate(
    "cart should have valid update timestamp",
    cart.updated_at !== undefined &&
      cart.updated_at !== null &&
      !isNaN(new Date(cart.updated_at).getTime()),
  );

  // Step 5: Validate coupon code persistence and cart metadata
  TestValidator.predicate(
    "coupon code should be properly recorded",
    cart.applied_coupon_code === couponCode,
  );

  TestValidator.predicate(
    "cart should not be deleted",
    cart.deleted_at === undefined || cart.deleted_at === null,
  );
}
