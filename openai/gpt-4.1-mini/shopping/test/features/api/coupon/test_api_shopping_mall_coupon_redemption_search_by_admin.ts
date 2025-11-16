import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCouponRedemption";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponRedemption";

export async function test_api_shopping_mall_coupon_redemption_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authenticates via join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "Admin1234!",
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates a coupon
  const nowISOString = new Date().toISOString();
  const startAt = nowISOString;
  const endAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days later

  const couponBody = {
    code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    discount_type: RandomGenerator.pick(["fixed", "percentage"] as const),
    discount_value: RandomGenerator.pick([1000, 5, 10, 20]),
    minimum_order_amount: null,
    maximum_discount_amount: null,
    start_at: startAt,
    end_at: endAt,
    usage_limit: null,
    per_customer_limit: null,
    status: "active",
  } satisfies IShoppingMallCoupon.ICreate;

  const coupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: couponBody,
    });
  typia.assert(coupon);

  // 3. Search for coupon redemptions with pagination and filters
  // Prepare test search body
  const searchBody = {
    page: 1,
    limit: 20,
    sort_by: "redemption_date",
    order: "desc",
    customer_name: null,
    order_id: null,
    start_date: null,
    end_date: null,
  } satisfies IShoppingMallCouponRedemption.IRequest;

  const pageResult: IPageIShoppingMallCouponRedemption.ISummary =
    await api.functional.shoppingMall.admin.coupons.redemptions.index(
      connection,
      {
        couponCode: coupon.code,
        body: searchBody,
      },
    );
  typia.assert(pageResult);

  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page 1",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit 20",
    pageResult.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    pageResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    pageResult.pagination.records >= pageResult.data.length,
  );

  // 5. Optional: Further validations on returned data structure
  for (const redemption of pageResult.data) {
    typia.assert(redemption);
    TestValidator.equals(
      "redemption coupon_id matches created coupon",
      redemption.coupon_id,
      coupon.id,
    );
    // redeemed_at should be a valid ISO string by typia.assert coverage
  }

  // 6. Optional: Try filtered search by customer_name
  const someCustomerName =
    pageResult.data.length > 0
      ? "" + pageResult.data[0].customer_id?.slice(0, 3) // partial, for test
      : null;

  if (someCustomerName !== null) {
    const filterByNameBody = {
      ...searchBody,
      page: 1,
      limit: 10,
      customer_name: someCustomerName,
    } satisfies IShoppingMallCouponRedemption.IRequest;

    const filteredResult =
      await api.functional.shoppingMall.admin.coupons.redemptions.index(
        connection,
        {
          couponCode: coupon.code,
          body: filterByNameBody,
        },
      );
    typia.assert(filteredResult);
    TestValidator.predicate(
      "filtered results do not exceed limit",
      filteredResult.data.length <= 10,
    );
  }
}
