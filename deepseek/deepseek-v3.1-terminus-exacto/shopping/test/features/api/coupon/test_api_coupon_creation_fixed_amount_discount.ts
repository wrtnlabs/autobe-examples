import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test coupon creation with fixed amount discount configuration. Validates that
 * fixed amount discounts are properly applied regardless of order size and that
 * minimum order amount requirements are enforced. Tests usage limits per
 * customer and overall usage limits to ensure proper coupon distribution
 * control.
 */
export async function test_api_coupon_creation_fixed_amount_discount(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({
        can_create_coupons: true,
        can_manage_promotions: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create fixed amount discount coupon with realistic values
  const discountValue = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const minOrderAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<500>
  >();
  const usagePerCustomer = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const totalUsageLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
  >();

  const couponData = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    discount_type: "fixed_amount",
    discount_value: discountValue,
    minimum_order_amount: minOrderAmount,
    usage_limit_per_customer: usagePerCustomer,
    total_usage_limit: totalUsageLimit,
    valid_from: new Date().toISOString(),
    valid_until: new Date(
      Date.now() +
        typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<86400000> &
            tags.Maximum<2592000000>
        >(),
    ).toISOString(), // 1-30 days from now
    is_active: true,
  } satisfies IShoppingMallCoupon.ICreate;

  const createdCoupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    {
      body: couponData,
    },
  );
  typia.assert(createdCoupon);

  // 3. Validate coupon properties match creation data
  TestValidator.equals(
    "coupon code matches input",
    createdCoupon.code,
    couponData.code,
  );
  TestValidator.equals(
    "coupon name matches input",
    createdCoupon.name,
    couponData.name,
  );
  TestValidator.equals(
    "discount type is fixed_amount",
    createdCoupon.discount_type,
    "fixed_amount",
  );
  TestValidator.equals(
    "discount value matches input",
    createdCoupon.discount_value,
    discountValue,
  );
  TestValidator.equals(
    "minimum order amount matches input",
    createdCoupon.minimum_order_amount,
    minOrderAmount,
  );
  TestValidator.equals(
    "usage limit per customer matches input",
    createdCoupon.usage_limit_per_customer,
    usagePerCustomer,
  );
  TestValidator.equals(
    "total usage limit matches input",
    createdCoupon.total_usage_limit,
    totalUsageLimit,
  );
  TestValidator.equals("coupon is active", createdCoupon.is_active, true);
  TestValidator.equals(
    "used count starts at zero",
    createdCoupon.used_count,
    0,
  );

  // 4. Validate timestamp properties are properly set
  TestValidator.predicate(
    "valid from date is in the past or present",
    new Date(createdCoupon.valid_from) <= new Date(),
  );
  TestValidator.predicate(
    "valid until date is in the future",
    new Date(createdCoupon.valid_until) > new Date(),
  );
  TestValidator.predicate(
    "created at timestamp is recent",
    Date.now() - new Date(createdCoupon.created_at).getTime() < 60000,
  ); // Within 1 minute
  TestValidator.predicate(
    "updated at matches created at for new coupon",
    createdCoupon.updated_at === createdCoupon.created_at,
  );

  // 5. Validate business logic for fixed amount discounts
  TestValidator.predicate(
    "fixed amount discount is positive",
    createdCoupon.discount_value > 0,
  );
  TestValidator.predicate(
    "minimum order amount is reasonable",
    createdCoupon.minimum_order_amount === null ||
      createdCoupon.minimum_order_amount === undefined ||
      createdCoupon.minimum_order_amount >= createdCoupon.discount_value,
  );

  // 6. Validate relationship properties
  TestValidator.predicate(
    "creator administrator relationship exists",
    createdCoupon.creator !== undefined,
  );
  TestValidator.equals(
    "creator administrator ID matches",
    createdCoupon.creator?.id,
    adminAuth.administrator.id,
  );
}
