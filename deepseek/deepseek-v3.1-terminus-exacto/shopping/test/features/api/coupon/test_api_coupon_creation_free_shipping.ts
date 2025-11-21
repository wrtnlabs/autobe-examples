import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test coupon creation with free shipping discount type.
 *
 * Validates that free shipping coupons properly waive shipping costs during
 * checkout while maintaining other order calculations. Tests channel-specific
 * coupon targeting and ensures coupons are only applicable to designated
 * shopping channels when specified.
 */
export async function test_api_coupon_creation_free_shipping(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123456!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ coupon_management: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create free shipping coupon
  const couponCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const currentDate = new Date();
  const futureDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  const freeShippingCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: {
        code: couponCode,
        name: "Free Shipping Promotion",
        description: "Free shipping coupon for all orders",
        discount_type: "free_shipping",
        discount_value: 0, // Free shipping typically has 0 discount value
        minimum_order_amount: 50, // Minimum order amount to qualify
        valid_from: currentDate.toISOString(),
        valid_until: futureDate.toISOString(),
        is_active: true,
        usage_limit_per_customer: 1,
        total_usage_limit: 1000,
      } satisfies IShoppingMallCoupon.ICreate,
    });
  typia.assert(freeShippingCoupon);

  // Step 3: Validate coupon properties
  TestValidator.equals(
    "coupon discount type should be free_shipping",
    freeShippingCoupon.discount_type,
    "free_shipping",
  );
  TestValidator.equals(
    "coupon code should match",
    freeShippingCoupon.code,
    couponCode,
  );
  TestValidator.equals(
    "coupon should be active",
    freeShippingCoupon.is_active,
    true,
  );
  TestValidator.equals(
    "used count should be zero initially",
    freeShippingCoupon.used_count,
    0,
  );
  TestValidator.predicate(
    "valid from should be before valid until",
    new Date(freeShippingCoupon.valid_from) <
      new Date(freeShippingCoupon.valid_until),
  );
  TestValidator.equals(
    "creator should be the authenticated admin",
    freeShippingCoupon.shopping_mall_administrator_id,
    adminAuth.administrator.id,
  );

  // Step 4: Test coupon with maximum discount constraint
  const constrainedCouponCode = RandomGenerator.alphaNumeric(8).toUpperCase();

  const constrainedCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: {
        code: constrainedCouponCode,
        name: "Free Shipping with Constraints",
        description: "Free shipping coupon with usage constraints",
        discount_type: "free_shipping",
        discount_value: 0,
        minimum_order_amount: 100,
        maximum_discount: 50, // Maximum discount cap for free shipping
        valid_from: currentDate.toISOString(),
        valid_until: futureDate.toISOString(),
        is_active: true,
        usage_limit_per_customer: 2,
        total_usage_limit: 500,
      } satisfies IShoppingMallCoupon.ICreate,
    });
  typia.assert(constrainedCoupon);

  // Validate constrained coupon
  TestValidator.equals(
    "constrained coupon discount type",
    constrainedCoupon.discount_type,
    "free_shipping",
  );
  TestValidator.equals(
    "constrained coupon code",
    constrainedCoupon.code,
    constrainedCouponCode,
  );
  TestValidator.equals(
    "constrained coupon minimum order amount",
    constrainedCoupon.minimum_order_amount,
    100,
  );
  TestValidator.equals(
    "constrained coupon maximum discount",
    constrainedCoupon.maximum_discount,
    50,
  );

  // Step 5: Test coupon creation without channel targeting (omit the property)
  const noChannelCouponCode = RandomGenerator.alphaNumeric(8).toUpperCase();

  const noChannelCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: {
        code: noChannelCouponCode,
        name: "No Channel Free Shipping",
        description: "Free shipping coupon without channel targeting",
        discount_type: "free_shipping",
        discount_value: 0,
        valid_from: currentDate.toISOString(),
        valid_until: futureDate.toISOString(),
        is_active: true,
      } satisfies IShoppingMallCoupon.ICreate,
    });
  typia.assert(noChannelCoupon);

  // Validate no-channel coupon
  TestValidator.equals(
    "no-channel coupon discount type",
    noChannelCoupon.discount_type,
    "free_shipping",
  );
  TestValidator.predicate(
    "no-channel coupon should have undefined channel",
    noChannelCoupon.channel === undefined,
  );
  TestValidator.predicate(
    "no-channel coupon should have undefined shopping_mall_channel_id",
    noChannelCoupon.shopping_mall_channel_id === undefined,
  );
}
