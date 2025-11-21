import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_create_percentage_discount(
  connection: api.IConnection,
) {
  // Authenticate as admin to create coupon
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Define coupon creation parameters
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoYearsLater = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);

  const coupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: `${RandomGenerator.alphaNumeric(16)}|${nextWeek.toISOString()}|${twoYearsLater.toISOString()}|20|100|50`,
      },
    );
  typia.assert(coupon);

  // Validate coupon was created successfully
  const couponCode = coupon.split("|")[0];
  TestValidator.equals("coupon code generated", couponCode.length, 16);
  TestValidator.predicate(
    "coupon is valid",
    couponCode.match(/^[a-zA-Z0-9]{16}$/) !== null,
  );
}
