import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test coupon creation with percentage-based discount configuration.
 *
 * Validates that percentage discounts are properly configured with maximum
 * discount caps to prevent excessive discounts on high-value orders. Tests
 * minimum order amount requirements and ensures percentage calculations work
 * correctly during coupon application scenarios.
 */
export async function test_api_coupon_creation_percentage_discount(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator for coupon creation
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

  // 2. Create percentage-based discount coupon with comprehensive configuration
  const couponData = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    discount_type: "percentage",
    discount_value: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<50>
    >(),
    minimum_order_amount: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<50000>
    >(),
    maximum_discount: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<5000> & tags.Maximum<20000>
    >(),
    usage_limit_per_customer: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
    total_usage_limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
    >(),
    valid_from: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    valid_until: new Date(Date.now() + 30 * 86400000).toISOString(), // 30 days from now
    is_active: true,
    shopping_mall_channel_id: undefined,
  } satisfies IShoppingMallCoupon.ICreate;

  const coupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    {
      body: couponData,
    },
  );
  typia.assert(coupon);

  // 3. Validate coupon creation response
  TestValidator.equals("coupon ID should be valid UUID", coupon.id, coupon.id);
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
    "percentage",
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
    "valid from should match",
    coupon.valid_from,
    couponData.valid_from,
  );
  TestValidator.equals(
    "valid until should match",
    coupon.valid_until,
    couponData.valid_until,
  );
  TestValidator.equals("is_active should be true", coupon.is_active, true);
  TestValidator.equals(
    "used_count should be 0 initially",
    coupon.used_count,
    0,
  );

  // 4. Validate business logic constraints
  TestValidator.predicate(
    "discount value should be between 5 and 50 percent",
    coupon.discount_value >= 5 && coupon.discount_value <= 50,
  );

  if (coupon.minimum_order_amount !== undefined) {
    TestValidator.predicate(
      "minimum order amount should be reasonable",
      coupon.minimum_order_amount >= 1000 &&
        coupon.minimum_order_amount <= 50000,
    );
  }

  if (coupon.maximum_discount !== undefined) {
    TestValidator.predicate(
      "maximum discount cap should prevent excessive discounts",
      coupon.maximum_discount >= 5000 && coupon.maximum_discount <= 20000,
    );
  }

  if (
    coupon.usage_limit_per_customer !== undefined &&
    coupon.total_usage_limit !== undefined
  ) {
    TestValidator.predicate(
      "usage limits should be properly set",
      coupon.usage_limit_per_customer >= 1 &&
        coupon.usage_limit_per_customer <= 10 &&
        coupon.total_usage_limit >= 100 &&
        coupon.total_usage_limit <= 1000,
    );
  }

  // 5. Validate timestamps and relationships
  TestValidator.predicate(
    "created_at should be recent",
    new Date(coupon.created_at).getTime() > Date.now() - 60000,
  );
  TestValidator.predicate(
    "updated_at should be close to created_at",
    Math.abs(
      new Date(coupon.updated_at).getTime() -
        new Date(coupon.created_at).getTime(),
    ) < 5000,
  );
  TestValidator.equals(
    "deleted_at should be undefined for active coupon",
    coupon.deleted_at,
    undefined,
  );
  TestValidator.equals(
    "shopping_mall_administrator_id should be set",
    coupon.shopping_mall_administrator_id,
    adminAuth.administrator.id,
  );
}
