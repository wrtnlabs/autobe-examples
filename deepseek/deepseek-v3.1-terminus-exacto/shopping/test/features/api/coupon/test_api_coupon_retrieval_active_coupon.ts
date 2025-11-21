import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test retrieval of active coupon to verify proper status validation.
 *
 * This test validates that active coupons can be retrieved by their unique
 * codes and that the system properly validates coupon status, validity periods,
 * and associated properties. The test creates an active coupon with current
 * validity period and verifies that all coupon details are correctly returned.
 */
export async function test_api_coupon_retrieval_active_coupon(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator for coupon creation
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({ access_level: "full" }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create channel for coupon association
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ test_mode: true }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create active coupon with current validity period
  const currentTime = new Date();
  const futureTime = new Date(currentTime.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  const couponCode = RandomGenerator.alphaNumeric(10).toUpperCase();
  const discountValue = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<50>
  >();
  const minOrderAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const maxDiscount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<5000> & tags.Maximum<50000>
  >();

  const coupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: {
        code: couponCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        discount_type: "percentage",
        discount_value: discountValue,
        minimum_order_amount: minOrderAmount,
        maximum_discount: maxDiscount,
        usage_limit_per_customer: 1,
        total_usage_limit: 100,
        valid_from: currentTime.toISOString(),
        valid_until: futureTime.toISOString(),
        is_active: true,
        shopping_mall_channel_id: channel.id,
      } satisfies IShoppingMallCoupon.ICreate,
    });
  typia.assert(coupon);

  // 4. Retrieve coupon by code
  const retrievedCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.coupons.at(connection, {
      couponCode: coupon.code,
    });
  typia.assert(retrievedCoupon);

  // 5. Validate coupon status and properties
  TestValidator.equals(
    "retrieved coupon ID matches created coupon",
    retrievedCoupon.id,
    coupon.id,
  );
  TestValidator.equals(
    "retrieved coupon code matches created coupon",
    retrievedCoupon.code,
    coupon.code,
  );
  TestValidator.equals(
    "retrieved coupon name matches created coupon",
    retrievedCoupon.name,
    coupon.name,
  );
  TestValidator.equals(
    "retrieved coupon description matches created coupon",
    retrievedCoupon.description,
    coupon.description,
  );
  TestValidator.equals("coupon is active", retrievedCoupon.is_active, true);
  TestValidator.equals(
    "retrieved coupon discount type matches created coupon",
    retrievedCoupon.discount_type,
    "percentage",
  );
  TestValidator.equals(
    "retrieved coupon discount value matches created coupon",
    retrievedCoupon.discount_value,
    discountValue,
  );
  TestValidator.equals(
    "retrieved coupon minimum order amount matches created coupon",
    retrievedCoupon.minimum_order_amount,
    minOrderAmount,
  );
  TestValidator.equals(
    "retrieved coupon maximum discount matches created coupon",
    retrievedCoupon.maximum_discount,
    maxDiscount,
  );
  TestValidator.equals(
    "retrieved coupon usage limit per customer matches created coupon",
    retrievedCoupon.usage_limit_per_customer,
    1,
  );
  TestValidator.equals(
    "retrieved coupon total usage limit matches created coupon",
    retrievedCoupon.total_usage_limit,
    100,
  );
  TestValidator.equals(
    "retrieved coupon channel association matches created coupon",
    retrievedCoupon.shopping_mall_channel_id,
    channel.id,
  );

  // Validate validity period
  const now = new Date();
  const couponValidFrom = new Date(retrievedCoupon.valid_from);
  const couponValidUntil = new Date(retrievedCoupon.valid_until);

  TestValidator.predicate(
    "coupon valid_from is before or equal to current time",
    couponValidFrom <= now,
  );
  TestValidator.predicate(
    "coupon valid_until is after current time",
    couponValidUntil > now,
  );

  // Validate usage count starts at 0
  TestValidator.equals(
    "new coupon used_count starts at 0",
    retrievedCoupon.used_count,
    0,
  );

  // Validate timestamp properties exist
  TestValidator.predicate(
    "coupon has created_at timestamp",
    retrievedCoupon.created_at !== undefined &&
      retrievedCoupon.created_at !== null,
  );
  TestValidator.predicate(
    "coupon has updated_at timestamp",
    retrievedCoupon.updated_at !== undefined &&
      retrievedCoupon.updated_at !== null,
  );
}
