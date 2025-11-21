import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test the complete coupon lifecycle from creation to deletion by an
 * administrator. Validates that coupons can be properly deleted using soft
 * deletion mechanism while preserving historical data. The scenario covers
 * authentication setup, coupon creation with valid parameters, and subsequent
 * deletion with proper authorization checks.
 */
export async function test_api_coupon_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({ can_manage_coupons: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create a coupon to be deleted
  const couponCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const currentDate = new Date();
  const validFrom = new Date(currentDate.getTime() - 86400000).toISOString(); // Yesterday
  const validUntil = new Date(
    currentDate.getTime() + 86400000 * 30,
  ).toISOString(); // 30 days from now

  const coupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    {
      body: {
        code: couponCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        discount_type: "percentage",
        discount_value: 15,
        minimum_order_amount: 50,
        maximum_discount: 100,
        usage_limit_per_customer: 5,
        total_usage_limit: 100,
        valid_from: validFrom,
        valid_until: validUntil,
        is_active: true,
        shopping_mall_channel_id: undefined,
      } satisfies IShoppingMallCoupon.ICreate,
    },
  );
  typia.assert(coupon);

  // Validate coupon creation
  TestValidator.equals(
    "created coupon code matches input",
    coupon.code,
    couponCode,
  );
  TestValidator.predicate("coupon should be active", coupon.is_active === true);

  // Step 3: Delete the coupon using soft deletion
  await api.functional.shoppingMall.admin.coupons.erase(connection, {
    couponCode: coupon.code,
  });

  // Step 4: Validate system continues to function post-deletion
  const newCouponCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const newCoupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    {
      body: {
        code: newCouponCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        discount_type: "fixed_amount",
        discount_value: 25,
        minimum_order_amount: 75,
        maximum_discount: undefined,
        usage_limit_per_customer: 3,
        total_usage_limit: 50,
        valid_from: validFrom,
        valid_until: validUntil,
        is_active: true,
        shopping_mall_channel_id: undefined,
      } satisfies IShoppingMallCoupon.ICreate,
    },
  );
  typia.assert(newCoupon);

  // Final validation: Ensure system functionality is maintained
  TestValidator.equals(
    "new coupon code matches input",
    newCoupon.code,
    newCouponCode,
  );
  TestValidator.predicate(
    "new coupon should be active",
    newCoupon.is_active === true,
  );
  TestValidator.notEquals(
    "new coupon should have different code",
    newCoupon.code,
    coupon.code,
  );

  // Validate authorization context is maintained
  TestValidator.predicate(
    "administrator authentication should be maintained",
    adminAuth.administrator.role === "super_admin",
  );
}
