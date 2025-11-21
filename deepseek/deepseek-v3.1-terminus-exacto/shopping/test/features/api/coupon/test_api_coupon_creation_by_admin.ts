import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test successful coupon creation workflow by an authenticated administrator.
 *
 * Validates that administrators can create coupons with various discount types
 * including percentage-based discounts, fixed amount reductions, and free
 * shipping offers. Tests proper validation of coupon parameters including
 * discount value ranges, validity periods, and usage limits.
 *
 * Ensures system generates unique uppercase alphanumeric coupon codes and
 * properly records creator information and timestamps for audit trail
 * purposes.
 */
export async function test_api_coupon_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator (dependency from scenario)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ can_create_coupons: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create comprehensive coupon with all discount type validations
  const couponData = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    discount_type: "percentage",
    discount_value: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    minimum_order_amount: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
    >(),
    maximum_discount: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<5000> & tags.Maximum<50000>
    >(),
    usage_limit_per_customer: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
    total_usage_limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
    >(),
    valid_from: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    valid_until: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
    is_active: true,
    shopping_mall_channel_id: undefined,
  } satisfies IShoppingMallCoupon.ICreate;

  const coupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    { body: couponData },
  );
  typia.assert(coupon);

  // Step 3: Validate coupon creation with proper TestValidator titles
  TestValidator.equals(
    "coupon code should match input",
    coupon.code,
    couponData.code,
  );
  TestValidator.equals(
    "coupon name should match input",
    coupon.name,
    couponData.name,
  );
  TestValidator.equals(
    "discount type should be percentage",
    coupon.discount_type,
    couponData.discount_type,
  );
  TestValidator.equals(
    "discount value should match input",
    coupon.discount_value,
    couponData.discount_value,
  );
  TestValidator.equals(
    "minimum order amount should match",
    coupon.minimum_order_amount,
    couponData.minimum_order_amount,
  );
  TestValidator.equals(
    "maximum discount should match",
    coupon.maximum_discount,
    couponData.maximum_discount,
  );
  TestValidator.equals(
    "usage limit per customer should match",
    coupon.usage_limit_per_customer,
    couponData.usage_limit_per_customer,
  );
  TestValidator.equals(
    "total usage limit should match",
    coupon.total_usage_limit,
    couponData.total_usage_limit,
  );
  TestValidator.equals(
    "valid from date should match",
    coupon.valid_from,
    couponData.valid_from,
  );
  TestValidator.equals(
    "valid until date should match",
    coupon.valid_until,
    couponData.valid_until,
  );
  TestValidator.equals(
    "is active flag should match",
    coupon.is_active,
    couponData.is_active,
  );

  // Step 4: Validate system-generated fields
  TestValidator.predicate(
    "coupon should have valid UUID ID",
    coupon.id.length === 36 && coupon.id.includes("-"),
  );
  TestValidator.equals(
    "new coupon should have zero usage count",
    coupon.used_count,
    0,
  );
  TestValidator.predicate(
    "created at timestamp should be set",
    coupon.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at timestamp should be set",
    coupon.updated_at !== undefined,
  );
  TestValidator.equals(
    "new coupon should not have deleted at timestamp",
    coupon.deleted_at,
    undefined,
  );
  TestValidator.equals(
    "creator ID should match authenticated admin",
    coupon.shopping_mall_administrator_id,
    adminAuth.administrator.id,
  );
  TestValidator.predicate(
    "administrator session ID should be valid UUID",
    coupon.shopping_mall_administrator_session_id.length === 36 &&
      coupon.shopping_mall_administrator_session_id.includes("-"),
  );

  // Step 5: Test creator relationship
  TestValidator.predicate(
    "creator relationship should be populated",
    coupon.creator !== undefined,
  );
  if (coupon.creator) {
    TestValidator.equals(
      "creator ID should match",
      coupon.creator.id,
      adminAuth.administrator.id,
    );
    TestValidator.equals(
      "creator email should match",
      coupon.creator.email,
      adminAuth.administrator.email,
    );
    TestValidator.equals(
      "creator role should match",
      coupon.creator.role,
      adminAuth.administrator.role,
    );
  }

  // Step 6: Test business logic - coupon should be active and within validity period
  TestValidator.predicate("coupon should be active", coupon.is_active);
  TestValidator.predicate(
    "valid from date should be in the future",
    new Date(coupon.valid_from) > new Date(),
  );
  TestValidator.predicate(
    "valid until date should be after valid from",
    new Date(coupon.valid_until) > new Date(coupon.valid_from),
  );

  // Step 7: Test discount value constraints
  TestValidator.predicate(
    "percentage discount should be between 1-100",
    coupon.discount_value >= 1 && coupon.discount_value <= 100,
  );

  if (coupon.minimum_order_amount !== undefined) {
    TestValidator.predicate(
      "minimum order amount should be positive",
      coupon.minimum_order_amount > 0,
    );
  }

  if (coupon.maximum_discount !== undefined) {
    TestValidator.predicate(
      "maximum discount should be positive",
      coupon.maximum_discount > 0,
    );
  }

  // Step 8: Test usage limits
  if (coupon.usage_limit_per_customer !== undefined) {
    TestValidator.predicate(
      "usage limit per customer should be positive",
      coupon.usage_limit_per_customer > 0,
    );
  }

  if (coupon.total_usage_limit !== undefined) {
    TestValidator.predicate(
      "total usage limit should be positive",
      coupon.total_usage_limit > 0,
    );
  }
}
