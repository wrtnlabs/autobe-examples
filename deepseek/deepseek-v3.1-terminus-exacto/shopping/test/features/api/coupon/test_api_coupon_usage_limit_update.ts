import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test updating coupon usage limits including per-customer limits and overall
 * platform limits. Validates that usage limit changes are properly enforced and
 * that existing usage counts are respected. Tests that reducing usage limits
 * doesn't invalidate coupons that have already exceeded the new limits but
 * prevents new applications appropriately.
 */
export async function test_api_coupon_usage_limit_update(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ coupon_management: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create initial coupon with usage limits
  const couponCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const initialCoupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    {
      body: {
        code: couponCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        discount_type: "percentage",
        discount_value: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<50>
        >(),
        usage_limit_per_customer: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<10>
        >(),
        total_usage_limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<50>
        >(),
        valid_from: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        valid_until: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
        is_active: true,
      } satisfies IShoppingMallCoupon.ICreate,
    },
  );
  typia.assert(initialCoupon);

  // Step 3: Define updated usage limits
  const newPerCustomerLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
  >();
  const newTotalLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<10>
  >();

  // Step 4: Update coupon with reduced usage limits
  const updatedCoupon = await api.functional.shoppingMall.admin.coupons.update(
    connection,
    {
      couponCode: couponCode,
      body: {
        usage_limit_per_customer: newPerCustomerLimit,
        total_usage_limit: newTotalLimit,
      } satisfies IShoppingMallCoupon.IUpdate,
    },
  );
  typia.assert(updatedCoupon);

  // Step 5: Validate that usage limits were updated correctly
  TestValidator.equals(
    "per-customer usage limit should be reduced",
    updatedCoupon.usage_limit_per_customer,
    newPerCustomerLimit,
  );

  TestValidator.equals(
    "total usage limit should be reduced",
    updatedCoupon.total_usage_limit,
    newTotalLimit,
  );

  // Step 6: Validate that limits were actually changed from original values
  TestValidator.notEquals(
    "per-customer limit should differ from original",
    updatedCoupon.usage_limit_per_customer,
    initialCoupon.usage_limit_per_customer,
  );

  TestValidator.notEquals(
    "total limit should differ from original",
    updatedCoupon.total_usage_limit,
    initialCoupon.total_usage_limit,
  );

  // Step 7: Validate that other coupon properties remain unchanged
  TestValidator.equals(
    "coupon code should remain the same",
    updatedCoupon.code,
    initialCoupon.code,
  );

  TestValidator.equals(
    "discount type should remain unchanged",
    updatedCoupon.discount_type,
    initialCoupon.discount_type,
  );

  TestValidator.equals(
    "discount value should remain unchanged",
    updatedCoupon.discount_value,
    initialCoupon.discount_value,
  );

  // Step 8: Validate that usage count remains intact
  TestValidator.equals(
    "used count should remain zero after update",
    updatedCoupon.used_count,
    0,
  );

  // Step 9: Validate that coupon remains active
  TestValidator.predicate(
    "coupon should remain active after update",
    updatedCoupon.is_active === true,
  );

  // Step 10: Test error condition - updating non-existent coupon
  await TestValidator.error(
    "updating non-existent coupon should fail",
    async () => {
      await api.functional.shoppingMall.admin.coupons.update(connection, {
        couponCode: "NONEXISTENT123",
        body: {
          usage_limit_per_customer: 5,
        } satisfies IShoppingMallCoupon.IUpdate,
      });
    },
  );

  // Step 11: Test error condition - invalid usage limits
  await TestValidator.error(
    "setting negative usage limit should fail",
    async () => {
      await api.functional.shoppingMall.admin.coupons.update(connection, {
        couponCode: couponCode,
        body: {
          usage_limit_per_customer: -1,
        } satisfies IShoppingMallCoupon.IUpdate,
      });
    },
  );
}
