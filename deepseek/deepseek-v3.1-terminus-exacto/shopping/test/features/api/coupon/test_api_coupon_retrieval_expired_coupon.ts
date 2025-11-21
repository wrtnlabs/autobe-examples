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
 * Test retrieval of expired coupon to verify date validation functionality.
 *
 * This test validates that expired coupons can be retrieved for reporting
 * purposes while maintaining proper expiration status indication. The workflow
 * involves:
 *
 * 1. Creating and authenticating an administrator account
 * 2. Creating a shopping mall channel for coupon association
 * 3. Creating an expired coupon with past expiration date
 * 4. Retrieving the expired coupon by code to verify accessibility
 * 5. Validating that the coupon properties are preserved including expiration
 *    status
 */
export async function test_api_coupon_retrieval_expired_coupon(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ can_manage_coupons: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create shopping mall channel for coupon association
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ allow_coupons: true }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create expired coupon with past expiration date
  const couponCode = RandomGenerator.alphaNumeric(10).toUpperCase();
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
  const olderPastDate = new Date(Date.now() - 172800000).toISOString(); // 2 days ago

  const expiredCoupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    {
      body: {
        code: couponCode,
        name: "Expired Test Coupon - Date Validation Test",
        description:
          "This coupon has expired for testing date validation functionality",
        discount_type: "percentage",
        discount_value: 15,
        minimum_order_amount: 5000,
        maximum_discount: 10000,
        usage_limit_per_customer: 1,
        total_usage_limit: 100,
        valid_from: olderPastDate, // Set to older past date
        valid_until: pastDate, // Set to more recent past date
        is_active: true,
        shopping_mall_channel_id: channel.id,
      } satisfies IShoppingMallCoupon.ICreate,
    },
  );
  typia.assert(expiredCoupon);

  // Step 4: Retrieve the expired coupon by code
  const retrievedCoupon = await api.functional.shoppingMall.coupons.at(
    connection,
    {
      couponCode: couponCode,
    },
  );
  typia.assert(retrievedCoupon);

  // Step 5: Validate coupon properties including expiration status
  TestValidator.equals(
    "coupon ID matches",
    retrievedCoupon.id,
    expiredCoupon.id,
  );
  TestValidator.equals("coupon code matches", retrievedCoupon.code, couponCode);
  TestValidator.equals(
    "coupon name matches",
    retrievedCoupon.name,
    "Expired Test Coupon - Date Validation Test",
  );
  TestValidator.equals(
    "discount type matches",
    retrievedCoupon.discount_type,
    "percentage",
  );
  TestValidator.equals(
    "discount value matches",
    retrievedCoupon.discount_value,
    15,
  );
  TestValidator.equals(
    "minimum order amount matches",
    retrievedCoupon.minimum_order_amount,
    5000,
  );
  TestValidator.equals(
    "maximum discount matches",
    retrievedCoupon.maximum_discount,
    10000,
  );
  TestValidator.equals(
    "usage limit per customer matches",
    retrievedCoupon.usage_limit_per_customer,
    1,
  );
  TestValidator.equals(
    "total usage limit matches",
    retrievedCoupon.total_usage_limit,
    100,
  );
  TestValidator.equals(
    "channel ID matches",
    retrievedCoupon.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.predicate(
    "coupon is active",
    retrievedCoupon.is_active === true,
  );
  TestValidator.predicate(
    "coupon valid_from is in past",
    new Date(retrievedCoupon.valid_from) < new Date(),
  );
  TestValidator.predicate(
    "coupon valid_until is in past",
    new Date(retrievedCoupon.valid_until) < new Date(),
  );
  TestValidator.predicate(
    "coupon has expired",
    new Date(retrievedCoupon.valid_until) < new Date(),
  );
  TestValidator.predicate(
    "used count is zero",
    retrievedCoupon.used_count === 0,
  );

  // Validate that expired coupon can be retrieved (main test objective)
  TestValidator.equals(
    "expired coupon retrieval successful",
    retrievedCoupon.code,
    couponCode,
  );
  TestValidator.predicate(
    "expired coupon maintains all properties",
    retrievedCoupon.id === expiredCoupon.id &&
      retrievedCoupon.code === expiredCoupon.code &&
      retrievedCoupon.name === expiredCoupon.name,
  );
}
