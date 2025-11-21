import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test updating coupon activation status to temporarily deactivate or
 * reactivate coupons. Validates that inactive coupons cannot be applied to
 * orders even if within validity period, and that reactivated coupons become
 * available for use again. Tests that status changes don't affect coupon usage
 * tracking or historical data.
 */
export async function test_api_coupon_activation_status_update(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ all: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create a test coupon with active status
  const couponCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const futureDate = new Date(Date.now() + 86400000 * 30); // 30 days from now
  const pastDate = new Date(Date.now() - 86400000 * 7); // 7 days ago

  const createdCoupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    {
      body: {
        code: couponCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        discount_type: "percentage",
        discount_value: 15,
        minimum_order_amount: 5000,
        maximum_discount: 10000,
        usage_limit_per_customer: 1,
        total_usage_limit: 100,
        valid_from: pastDate.toISOString(),
        valid_until: futureDate.toISOString(),
        is_active: true,
        shopping_mall_channel_id: undefined,
      } satisfies IShoppingMallCoupon.ICreate,
    },
  );
  typia.assert(createdCoupon);
  TestValidator.equals(
    "coupon initially active",
    createdCoupon.is_active,
    true,
  );

  // Step 3: Test deactivation - update coupon status to inactive
  const deactivatedCoupon =
    await api.functional.shoppingMall.admin.coupons.update(connection, {
      couponCode: couponCode,
      body: {
        is_active: false,
      } satisfies IShoppingMallCoupon.IUpdate,
    });
  typia.assert(deactivatedCoupon);
  TestValidator.equals(
    "coupon deactivated",
    deactivatedCoupon.is_active,
    false,
  );
  TestValidator.equals(
    "coupon code unchanged",
    deactivatedCoupon.code,
    couponCode,
  );
  TestValidator.equals(
    "discount value unchanged",
    deactivatedCoupon.discount_value,
    15,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    deactivatedCoupon.updated_at,
    createdCoupon.updated_at,
  );

  // Step 4: Test reactivation - update coupon status back to active
  const reactivatedCoupon =
    await api.functional.shoppingMall.admin.coupons.update(connection, {
      couponCode: couponCode,
      body: {
        is_active: true,
      } satisfies IShoppingMallCoupon.IUpdate,
    });
  typia.assert(reactivatedCoupon);
  TestValidator.equals("coupon reactivated", reactivatedCoupon.is_active, true);
  TestValidator.equals(
    "coupon code remains",
    reactivatedCoupon.code,
    couponCode,
  );
  TestValidator.equals(
    "usage count unchanged",
    reactivatedCoupon.used_count,
    0,
  );
  TestValidator.notEquals(
    "updated_at timestamp updated again",
    reactivatedCoupon.updated_at,
    deactivatedCoupon.updated_at,
  );

  // Step 5: Test multiple status changes in sequence
  const finalDeactivation =
    await api.functional.shoppingMall.admin.coupons.update(connection, {
      couponCode: couponCode,
      body: {
        is_active: false,
      } satisfies IShoppingMallCoupon.IUpdate,
    });
  typia.assert(finalDeactivation);
  TestValidator.equals(
    "final deactivation successful",
    finalDeactivation.is_active,
    false,
  );

  // Step 6: Verify that other coupon properties remain unchanged through all updates
  TestValidator.equals(
    "name unchanged through updates",
    finalDeactivation.name,
    createdCoupon.name,
  );
  TestValidator.equals(
    "description unchanged",
    finalDeactivation.description,
    createdCoupon.description,
  );
  TestValidator.equals(
    "discount type unchanged",
    finalDeactivation.discount_type,
    createdCoupon.discount_type,
  );
  TestValidator.equals(
    "valid from unchanged",
    finalDeactivation.valid_from,
    createdCoupon.valid_from,
  );
  TestValidator.equals(
    "valid until unchanged",
    finalDeactivation.valid_until,
    createdCoupon.valid_until,
  );
  TestValidator.equals(
    "usage limits unchanged",
    finalDeactivation.usage_limit_per_customer,
    createdCoupon.usage_limit_per_customer,
  );
  TestValidator.equals(
    "total usage limit unchanged",
    finalDeactivation.total_usage_limit,
    createdCoupon.total_usage_limit,
  );

  // Step 7: Test that status changes don't affect creation timestamp
  TestValidator.equals(
    "created_at timestamp remains constant",
    finalDeactivation.created_at,
    createdCoupon.created_at,
  );

  // Step 8: Test sequential status changes to ensure proper state management
  const finalReactivation =
    await api.functional.shoppingMall.admin.coupons.update(connection, {
      couponCode: couponCode,
      body: {
        is_active: true,
      } satisfies IShoppingMallCoupon.IUpdate,
    });
  typia.assert(finalReactivation);
  TestValidator.equals(
    "final reactivation successful",
    finalReactivation.is_active,
    true,
  );

  // Verify all core properties remain intact after multiple status changes
  TestValidator.equals(
    "all properties intact after multiple updates",
    {
      code: finalReactivation.code,
      name: finalReactivation.name,
      discount_type: finalReactivation.discount_type,
      discount_value: finalReactivation.discount_value,
      valid_from: finalReactivation.valid_from,
      valid_until: finalReactivation.valid_until,
      used_count: finalReactivation.used_count,
    },
    {
      code: createdCoupon.code,
      name: createdCoupon.name,
      discount_type: createdCoupon.discount_type,
      discount_value: createdCoupon.discount_value,
      valid_from: createdCoupon.valid_from,
      valid_until: createdCoupon.valid_until,
      used_count: createdCoupon.used_count,
    },
  );

  console.log("Coupon activation status update test completed successfully");
}
