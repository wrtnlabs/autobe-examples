import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test coupon application and removal functionality in shopping cart updates.
 *
 * This E2E test validates that coupon codes can be properly applied to and
 * removed from shopping carts, ensuring that discount calculations are
 * correctly handled and cart properties are updated accordingly during
 * modification operations.
 */
export async function test_api_cart_update_coupon_application(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
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
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Validate initial cart state
  TestValidator.equals(
    "cart should be active initially",
    cart.status,
    "active",
  );
  TestValidator.equals(
    "cart should have no coupon initially",
    cart.applied_coupon_code,
    undefined,
  );

  // Step 3: Apply coupon code to the cart
  const couponCode = RandomGenerator.alphaNumeric(10).toUpperCase(); // Generate realistic coupon code
  const updatedCartWithCoupon =
    await api.functional.shoppingMall.customer.carts.update(connection, {
      cartId: cart.id,
      body: {
        applied_coupon_code: couponCode,
      } satisfies IShoppingMallCart.IUpdate,
    });
  typia.assert(updatedCartWithCoupon);

  // Validate coupon was applied and cart status remains consistent
  TestValidator.equals(
    "cart should have applied coupon code",
    updatedCartWithCoupon.applied_coupon_code,
    couponCode,
  );
  TestValidator.equals(
    "cart status should remain active after coupon application",
    updatedCartWithCoupon.status,
    "active",
  );

  // Step 4: Remove coupon code from the cart
  const updatedCartWithoutCoupon =
    await api.functional.shoppingMall.customer.carts.update(connection, {
      cartId: cart.id,
      body: {
        applied_coupon_code: null,
      } satisfies IShoppingMallCart.IUpdate,
    });
  typia.assert(updatedCartWithoutCoupon);

  // Validate coupon was removed and cart status remains consistent
  TestValidator.equals(
    "cart should have no coupon code after removal",
    updatedCartWithoutCoupon.applied_coupon_code,
    undefined,
  );
  TestValidator.equals(
    "cart status should remain active after coupon removal",
    updatedCartWithoutCoupon.status,
    "active",
  );

  // Step 5: Test applying empty coupon code (should be treated as removal)
  const cartWithEmptyCoupon =
    await api.functional.shoppingMall.customer.carts.update(connection, {
      cartId: cart.id,
      body: {
        applied_coupon_code: "",
      } satisfies IShoppingMallCart.IUpdate,
    });
  typia.assert(cartWithEmptyCoupon);

  // Validate empty coupon code results in no coupon
  TestValidator.equals(
    "empty coupon code should result in no coupon",
    cartWithEmptyCoupon.applied_coupon_code,
    undefined,
  );

  // Step 6: Test final coupon application with different code
  const finalCouponCode =
    "TEST" + RandomGenerator.alphaNumeric(6).toUpperCase();
  const finalCartUpdate =
    await api.functional.shoppingMall.customer.carts.update(connection, {
      cartId: cart.id,
      body: {
        applied_coupon_code: finalCouponCode,
      } satisfies IShoppingMallCart.IUpdate,
    });
  typia.assert(finalCartUpdate);

  // Validate final coupon application
  TestValidator.equals(
    "cart should have final coupon code",
    finalCartUpdate.applied_coupon_code,
    finalCouponCode,
  );
  TestValidator.equals(
    "cart status should remain active throughout",
    finalCartUpdate.status,
    "active",
  );
}
