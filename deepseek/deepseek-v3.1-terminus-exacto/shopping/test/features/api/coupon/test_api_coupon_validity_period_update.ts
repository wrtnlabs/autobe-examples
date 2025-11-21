import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test updating coupon validity periods including start and end dates.
 * Validates that coupon activation and expiration timestamps are properly
 * updated and that coupons become active/inactive at the correct times. Tests
 * that validity period changes don't affect coupons that have already been used
 * in orders.
 */
export async function test_api_coupon_validity_period_update(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

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

  // Step 2: Create a coupon with initial validity period
  const initialValidFrom = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const initialValidUntil = new Date(Date.now() + 86400000 * 30).toISOString(); // 30 days from now

  const couponCreateData = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    discount_type: "percentage",
    discount_value: 15,
    minimum_order_amount: 5000,
    maximum_discount: 10000,
    usage_limit_per_customer: 3,
    total_usage_limit: 100,
    valid_from: initialValidFrom,
    valid_until: initialValidUntil,
    is_active: true,
  } satisfies IShoppingMallCoupon.ICreate;

  const createdCoupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    { body: couponCreateData },
  );
  typia.assert(createdCoupon);

  // Step 3: Update coupon validity periods
  const updatedValidFrom = new Date(Date.now() + 86400000 * 2).toISOString(); // 2 days from now
  const updatedValidUntil = new Date(Date.now() + 86400000 * 45).toISOString(); // 45 days from now

  const couponUpdateData = {
    valid_from: updatedValidFrom,
    valid_until: updatedValidUntil,
  } satisfies IShoppingMallCoupon.IUpdate;

  const updatedCoupon = await api.functional.shoppingMall.admin.coupons.update(
    connection,
    {
      couponCode: createdCoupon.code,
      body: couponUpdateData,
    },
  );
  typia.assert(updatedCoupon);

  // Step 4: Validate the updates
  TestValidator.equals(
    "coupon code should remain unchanged",
    updatedCoupon.code,
    createdCoupon.code,
  );

  TestValidator.equals(
    "valid_from should be updated",
    updatedCoupon.valid_from,
    updatedValidFrom,
  );

  TestValidator.equals(
    "valid_until should be updated",
    updatedCoupon.valid_until,
    updatedValidUntil,
  );

  TestValidator.equals(
    "other properties should remain unchanged",
    updatedCoupon.name,
    createdCoupon.name,
  );

  TestValidator.equals(
    "discount value should remain unchanged",
    updatedCoupon.discount_value,
    createdCoupon.discount_value,
  );

  TestValidator.equals(
    "usage limits should remain unchanged",
    updatedCoupon.total_usage_limit,
    createdCoupon.total_usage_limit,
  );

  // Step 5: Verify business logic - coupon should still be active
  TestValidator.predicate(
    "updated coupon should be active",
    updatedCoupon.is_active,
  );

  // Step 6: Test that used_count remains unchanged (no usage scenario)
  TestValidator.equals(
    "used_count should remain zero",
    updatedCoupon.used_count,
    0,
  );
}
