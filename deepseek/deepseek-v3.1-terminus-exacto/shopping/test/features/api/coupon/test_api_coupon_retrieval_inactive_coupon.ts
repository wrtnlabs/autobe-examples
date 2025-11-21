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
 * Test retrieval of inactive coupon to verify status-based access control.
 * Admin creates inactive coupon, then attempts to retrieve it by code.
 * Validates that inactive coupons can still be retrieved for administrative
 * purposes but proper status indication is maintained.
 */
export async function test_api_coupon_retrieval_inactive_coupon(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminPassword123",
        first_name: RandomGenerator.paragraph({ sentences: 2 }),
        last_name: RandomGenerator.paragraph({ sentences: 1 }),
        role: "support_admin",
        permissions: JSON.stringify({ can_manage_coupons: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a channel for coupon creation context
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ allow_coupons: true }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create an inactive coupon
  const couponCode: string = RandomGenerator.alphaNumeric(10).toUpperCase();
  const coupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: {
        code: couponCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        discount_type: "percentage",
        discount_value: 15,
        minimum_order_amount: 50,
        maximum_discount: 25,
        usage_limit_per_customer: 1,
        total_usage_limit: 100,
        valid_from: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        valid_until: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
        is_active: false, // Inactive coupon
        shopping_mall_channel_id: channel.id,
      } satisfies IShoppingMallCoupon.ICreate,
    });
  typia.assert(coupon);

  // 4. Retrieve the inactive coupon by code
  const retrievedCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.coupons.at(connection, {
      couponCode: coupon.code,
    });
  typia.assert(retrievedCoupon);

  // 5. Validate that the coupon maintains its inactive status
  TestValidator.equals(
    "inactive coupon status is preserved",
    retrievedCoupon.is_active,
    false,
  );

  // 6. Validate coupon data integrity
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
    "retrieved coupon discount type matches created coupon",
    retrievedCoupon.discount_type,
    coupon.discount_type,
  );
  TestValidator.equals(
    "retrieved coupon discount value matches created coupon",
    retrievedCoupon.discount_value,
    coupon.discount_value,
  );
  TestValidator.equals(
    "retrieved coupon minimum order amount matches created coupon",
    retrievedCoupon.minimum_order_amount,
    coupon.minimum_order_amount,
  );
  TestValidator.equals(
    "retrieved coupon maximum discount matches created coupon",
    retrievedCoupon.maximum_discount,
    coupon.maximum_discount,
  );
  TestValidator.equals(
    "retrieved coupon usage limit per customer matches created coupon",
    retrievedCoupon.usage_limit_per_customer,
    coupon.usage_limit_per_customer,
  );
  TestValidator.equals(
    "retrieved coupon total usage limit matches created coupon",
    retrievedCoupon.total_usage_limit,
    coupon.total_usage_limit,
  );

  // 7. Validate that used_count is initialized to 0
  TestValidator.equals(
    "new coupon has zero usage count",
    retrievedCoupon.used_count,
    0,
  );

  // 8. Validate timestamps are properly set
  TestValidator.predicate(
    "coupon has valid creation timestamp",
    retrievedCoupon.created_at !== null &&
      retrievedCoupon.created_at !== undefined,
  );
  TestValidator.predicate(
    "coupon has valid update timestamp",
    retrievedCoupon.updated_at !== null &&
      retrievedCoupon.updated_at !== undefined,
  );

  // 9. Validate channel relationship
  TestValidator.equals(
    "coupon channel ID matches created channel",
    retrievedCoupon.shopping_mall_channel_id,
    channel.id,
  );

  // 10. Validate creator relationship
  TestValidator.equals(
    "coupon creator ID matches admin ID",
    retrievedCoupon.shopping_mall_administrator_id,
    admin.administrator.id,
  );
}
