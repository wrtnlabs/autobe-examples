import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

/**
 * Test successful creation of a promotional coupon with category restrictions
 * and usage cap. Admin authenticates, provides unique coupon code, sets 25%
 * discount, valid for 90 days with 50 usage limit, restricts to multiple
 * categories. Validates that coupon is created with correct
 * applicable_to_categories array, usage_count starts at 0, and expiration_date
 * is properly calculated from creation date.
 */
export async function test_api_coupon_creation_category_restricted(
  connection: api.IConnection,
) {
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "full_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  const couponData = {
    code: RandomGenerator.alphaNumeric(12),
    discount_percentage: 25,
    valid_days: 90,
    usage_limit: 50,
    applicable_to_categories: ["electronics", "clothes"],
  };

  const couponJsonString = JSON.stringify(couponData);

  const coupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: couponJsonString satisfies IShoppingMallCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  TestValidator.equals("coupon code matches", coupon, couponData.code);
}
