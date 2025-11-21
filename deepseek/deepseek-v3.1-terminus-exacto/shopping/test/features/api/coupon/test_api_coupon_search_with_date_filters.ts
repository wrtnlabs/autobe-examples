import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCoupon";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Validates coupon search functionality with date range filters in the shopping
 * mall platform. Tests various date filtering scenarios including boundary
 * conditions, overlapping periods, and combined valid_from/valid_until filters
 * to ensure accurate coupon search results.
 */
export async function test_api_coupon_search_with_date_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        first_name: "Test",
        last_name: "Administrator",
        role: "super_admin",
        permissions: JSON.stringify({ can_manage_coupons: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create test coupons with different validity periods
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Coupon 1: Past coupon (expired)
  const pastCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: "Past Coupon",
        description: "Coupon that expired yesterday",
        discount_type: "percentage",
        discount_value: 10,
        minimum_order_amount: 50,
        valid_from: new Date(now.getTime() - 3 * oneDayMs).toISOString(),
        valid_until: new Date(now.getTime() - oneDayMs).toISOString(),
        is_active: true,
      } satisfies IShoppingMallCoupon.ICreate,
    });
  typia.assert(pastCoupon);

  // Coupon 2: Current coupon (active now)
  const currentCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: "Current Coupon",
        description: "Coupon active right now",
        discount_type: "fixed_amount",
        discount_value: 15,
        valid_from: new Date(now.getTime() - oneDayMs).toISOString(),
        valid_until: new Date(now.getTime() + oneDayMs).toISOString(),
        is_active: true,
      } satisfies IShoppingMallCoupon.ICreate,
    });
  typia.assert(currentCoupon);

  // Coupon 3: Future coupon (not yet active)
  const futureCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: "Future Coupon",
        description: "Coupon that starts tomorrow",
        discount_type: "free_shipping",
        discount_value: 0,
        valid_from: new Date(now.getTime() + oneDayMs).toISOString(),
        valid_until: new Date(now.getTime() + 3 * oneDayMs).toISOString(),
        is_active: true,
      } satisfies IShoppingMallCoupon.ICreate,
    });
  typia.assert(futureCoupon);

  // Step 3: Test search with date range that includes only current coupon
  const currentDateRangeSearch: IPageIShoppingMallCoupon.ISummary =
    await api.functional.shoppingMall.admin.coupons.index(connection, {
      body: {
        valid_from_min: new Date(now.getTime() - oneDayMs).toISOString(),
        valid_until_max: new Date(now.getTime() + oneDayMs).toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(currentDateRangeSearch);

  // Validate that only current coupon is returned
  TestValidator.equals(
    "current date range should return only current coupon",
    currentDateRangeSearch.data.length,
    1,
  );
  TestValidator.equals(
    "current coupon ID should match",
    currentDateRangeSearch.data[0].id,
    currentCoupon.id,
  );

  // Step 4: Test search with future date range
  const futureDateRangeSearch: IPageIShoppingMallCoupon.ISummary =
    await api.functional.shoppingMall.admin.coupons.index(connection, {
      body: {
        valid_from_min: new Date(now.getTime() + oneDayMs).toISOString(),
        valid_until_max: new Date(now.getTime() + 3 * oneDayMs).toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(futureDateRangeSearch);

  // Validate that only future coupon is returned
  TestValidator.equals(
    "future date range should return only future coupon",
    futureDateRangeSearch.data.length,
    1,
  );
  TestValidator.equals(
    "future coupon ID should match",
    futureDateRangeSearch.data[0].id,
    futureCoupon.id,
  );

  // Step 5: Test search with combined valid_from and valid_until filters
  const combinedFilterSearch: IPageIShoppingMallCoupon.ISummary =
    await api.functional.shoppingMall.admin.coupons.index(connection, {
      body: {
        valid_from_min: new Date(now.getTime() - 2 * oneDayMs).toISOString(),
        valid_from_max: new Date(now.getTime() + 2 * oneDayMs).toISOString(),
        valid_until_min: new Date(now.getTime() - oneDayMs).toISOString(),
        valid_until_max: new Date(now.getTime() + 2 * oneDayMs).toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(combinedFilterSearch);

  // Should include both past and current coupons (future coupon starts after valid_from_max)
  TestValidator.predicate(
    "combined filter should return multiple coupons",
    combinedFilterSearch.data.length >= 2,
  );

  // Step 6: Test boundary condition - coupons ending exactly on filter boundary
  const boundarySearch: IPageIShoppingMallCoupon.ISummary =
    await api.functional.shoppingMall.admin.coupons.index(connection, {
      body: {
        valid_until_min: new Date(now.getTime() - oneDayMs).toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(boundarySearch);

  // Should include coupons that ended on or after the boundary date
  TestValidator.predicate(
    "boundary search should return coupons",
    boundarySearch.data.length > 0,
  );

  // Step 7: Test empty result scenario with non-overlapping date range
  const emptyResultSearch: IPageIShoppingMallCoupon.ISummary =
    await api.functional.shoppingMall.admin.coupons.index(connection, {
      body: {
        valid_from_min: new Date(now.getTime() + 10 * oneDayMs).toISOString(),
        valid_until_max: new Date(now.getTime() + 20 * oneDayMs).toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCoupon.IRequest,
    });
  typia.assert(emptyResultSearch);

  TestValidator.equals(
    "non-overlapping date range should return empty results",
    emptyResultSearch.data.length,
    0,
  );
}
