import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCoupon";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test search for expired coupons to verify proper date filtering
 * functionality. Admin creates channel and coupons with past expiration dates,
 * then searches using valid_until_max filter to find expired coupons. Validates
 * that expired coupons are correctly identified and returned while excluding
 * active coupons.
 */
export async function test_api_coupon_search_expired_coupons(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ access_level: "full" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create channel for coupon creation
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ theme: "default" }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create coupons with different expiration dates
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(
    now.getTime() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  // Create expired coupon (valid until yesterday)
  const expiredCoupon1 = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: "Expired Coupon 1",
        description: "First expired coupon for testing",
        discount_type: "percentage",
        discount_value: 10,
        minimum_order_amount: 50,
        valid_from: twoDaysAgo,
        valid_until: yesterday,
        is_active: true,
        shopping_mall_channel_id: channel.id,
      } satisfies IShoppingMallCoupon.ICreate,
    },
  );
  typia.assert(expiredCoupon1);

  // Create active coupon (valid until tomorrow)
  const activeCoupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: "Active Coupon",
        description: "Active coupon for comparison",
        discount_type: "fixed_amount",
        discount_value: 5,
        valid_from: yesterday,
        valid_until: tomorrow,
        is_active: true,
        shopping_mall_channel_id: channel.id,
      } satisfies IShoppingMallCoupon.ICreate,
    },
  );
  typia.assert(activeCoupon);

  // Create another expired coupon (valid until 2 days ago)
  const expiredCoupon2 = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: "Expired Coupon 2",
        description: "Second expired coupon for testing",
        discount_type: "free_shipping",
        discount_value: 0,
        valid_from: twoDaysAgo,
        valid_until: twoDaysAgo,
        is_active: true,
        shopping_mall_channel_id: channel.id,
      } satisfies IShoppingMallCoupon.ICreate,
    },
  );
  typia.assert(expiredCoupon2);

  // Step 4: Search for expired coupons using valid_until_max filter
  const searchResult = await api.functional.shoppingMall.coupons.index(
    connection,
    {
      body: {
        valid_until_max: now.toISOString(),
        is_active: true,
        channel_id: channel.id,
        limit: 10,
        page: 1,
      } satisfies IShoppingMallCoupon.IRequest,
    },
  );
  typia.assert(searchResult);

  // Step 5: Validate search results
  TestValidator.equals(
    "search should return expired coupons only",
    searchResult.data.length,
    2,
  );

  // Verify expired coupons are included
  const foundExpiredCoupon1 = searchResult.data.find(
    (coupon) => coupon.id === expiredCoupon1.id,
  );
  TestValidator.predicate(
    "first expired coupon should be found",
    foundExpiredCoupon1 !== undefined,
  );

  const foundExpiredCoupon2 = searchResult.data.find(
    (coupon) => coupon.id === expiredCoupon2.id,
  );
  TestValidator.predicate(
    "second expired coupon should be found",
    foundExpiredCoupon2 !== undefined,
  );

  // Verify active coupon is excluded
  const foundActiveCoupon = searchResult.data.find(
    (coupon) => coupon.id === activeCoupon.id,
  );
  TestValidator.predicate(
    "active coupon should not be found in expired results",
    foundActiveCoupon === undefined,
  );

  // Validate coupon properties
  if (foundExpiredCoupon1) {
    TestValidator.equals(
      "expired coupon 1 code matches",
      foundExpiredCoupon1.code,
      expiredCoupon1.code,
    );
    TestValidator.equals(
      "expired coupon 1 discount type matches",
      foundExpiredCoupon1.discount_type,
      "percentage",
    );
  }

  if (foundExpiredCoupon2) {
    TestValidator.equals(
      "expired coupon 2 code matches",
      foundExpiredCoupon2.code,
      expiredCoupon2.code,
    );
    TestValidator.equals(
      "expired coupon 2 discount type matches",
      foundExpiredCoupon2.discount_type,
      "free_shipping",
    );
  }
}
