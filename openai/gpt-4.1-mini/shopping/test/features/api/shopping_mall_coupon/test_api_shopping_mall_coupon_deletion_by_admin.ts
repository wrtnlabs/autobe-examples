import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_shopping_mall_coupon_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authentication with join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "StrongPass123!",
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new coupon
  const start = new Date();
  const end = new Date(start.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days later
  const couponCreateBody = {
    code: `TESTCOUPON${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    description: "Test marketing coupon for deletion",
    discount_type: RandomGenerator.pick(["fixed", "percentage"] as const),
    discount_value: 10,
    minimum_order_amount: 1000,
    maximum_discount_amount: 5000,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    usage_limit: 1000,
    per_customer_limit: 5,
    status: "active",
  } satisfies IShoppingMallCoupon.ICreate;

  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: couponCreateBody,
    });
  typia.assert(createdCoupon);
  TestValidator.equals(
    "created coupon code matches input",
    createdCoupon.code,
    couponCreateBody.code,
  );

  // 3. Delete the created coupon by couponCode
  await api.functional.shoppingMall.admin.coupons.erase(connection, {
    couponCode: createdCoupon.code,
  });
}
