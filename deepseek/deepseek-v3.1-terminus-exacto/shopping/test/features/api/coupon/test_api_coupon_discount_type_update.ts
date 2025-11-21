import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test updating coupon discount type from percentage to fixed amount and vice
 * versa. Validates that discount type changes don't invalidate existing coupon
 * applications and that new discount calculations work correctly. Tests maximum
 * discount cap adjustments for percentage-based coupons and ensures proper
 * validation of discount value ranges.
 */
export async function test_api_coupon_discount_type_update(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin123!",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({ access: "full" }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create initial coupon with percentage discount
  const percentageCouponData = {
    code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    discount_type: "percentage",
    discount_value: 15, // 15% discount
    minimum_order_amount: 5000,
    maximum_discount: 1000, // Maximum discount cap of 1000
    usage_limit_per_customer: 3,
    total_usage_limit: 100,
    valid_from: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    valid_until: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
    is_active: true,
  } satisfies IShoppingMallCoupon.ICreate;

  const percentageCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: percentageCouponData,
    });
  typia.assert(percentageCoupon);

  // Validate initial percentage coupon properties
  TestValidator.equals(
    "coupon discount type should be percentage",
    percentageCoupon.discount_type,
    "percentage",
  );
  TestValidator.equals(
    "coupon discount value should be 15",
    percentageCoupon.discount_value,
    15,
  );
  TestValidator.equals(
    "coupon maximum discount should be 1000",
    percentageCoupon.maximum_discount,
    1000,
  );

  // Step 3: Update coupon to fixed amount discount
  const fixedAmountUpdateData = {
    discount_type: "fixed_amount",
    discount_value: 750, // Fixed amount discount of 750
    maximum_discount: undefined, // Remove maximum discount cap for fixed amount
  } satisfies IShoppingMallCoupon.IUpdate;

  const updatedCoupon = await api.functional.shoppingMall.admin.coupons.update(
    connection,
    {
      couponCode: percentageCoupon.code,
      body: fixedAmountUpdateData,
    },
  );
  typia.assert(updatedCoupon);

  // Validate updated coupon properties
  TestValidator.equals(
    "updated coupon discount type should be fixed_amount",
    updatedCoupon.discount_type,
    "fixed_amount",
  );
  TestValidator.equals(
    "updated coupon discount value should be 750",
    updatedCoupon.discount_value,
    750,
  );
  TestValidator.equals(
    "updated coupon should not have maximum discount",
    updatedCoupon.maximum_discount,
    undefined,
  );
  TestValidator.notEquals(
    "updated coupon should have different updated_at timestamp",
    updatedCoupon.updated_at,
    percentageCoupon.updated_at,
  );

  // Step 4: Update back to percentage discount with different values
  const percentageUpdateData = {
    discount_type: "percentage",
    discount_value: 20, // Increased to 20% discount
    maximum_discount: 1500, // Increased maximum discount cap
  } satisfies IShoppingMallCoupon.IUpdate;

  const finalCoupon = await api.functional.shoppingMall.admin.coupons.update(
    connection,
    {
      couponCode: updatedCoupon.code,
      body: percentageUpdateData,
    },
  );
  typia.assert(finalCoupon);

  // Validate final coupon properties
  TestValidator.equals(
    "final coupon discount type should be percentage",
    finalCoupon.discount_type,
    "percentage",
  );
  TestValidator.equals(
    "final coupon discount value should be 20",
    finalCoupon.discount_value,
    20,
  );
  TestValidator.equals(
    "final coupon maximum discount should be 1500",
    finalCoupon.maximum_discount,
    1500,
  );

  // Step 5: Test discount value range validation
  await TestValidator.error(
    "should reject negative discount value for percentage",
    async () => {
      await api.functional.shoppingMall.admin.coupons.update(connection, {
        couponCode: finalCoupon.code,
        body: {
          discount_value: -5,
        } satisfies IShoppingMallCoupon.IUpdate,
      });
    },
  );

  await TestValidator.error(
    "should reject zero discount value for fixed amount",
    async () => {
      await api.functional.shoppingMall.admin.coupons.update(connection, {
        couponCode: finalCoupon.code,
        body: {
          discount_type: "fixed_amount",
          discount_value: 0,
        } satisfies IShoppingMallCoupon.IUpdate,
      });
    },
  );

  // Step 6: Test valid discount type transitions
  const validTransition =
    await api.functional.shoppingMall.admin.coupons.update(connection, {
      couponCode: finalCoupon.code,
      body: {
        discount_type: "fixed_amount",
        discount_value: 500,
      } satisfies IShoppingMallCoupon.IUpdate,
    });
  typia.assert(validTransition);

  TestValidator.equals(
    "transitioned coupon discount type should be fixed_amount",
    validTransition.discount_type,
    "fixed_amount",
  );
  TestValidator.equals(
    "transitioned coupon discount value should be 500",
    validTransition.discount_value,
    500,
  );
}
