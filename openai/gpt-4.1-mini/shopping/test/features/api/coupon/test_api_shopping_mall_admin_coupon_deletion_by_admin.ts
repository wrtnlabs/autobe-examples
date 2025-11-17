import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_shopping_mall_admin_coupon_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration (join) and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "strongPassword123!",
        ip: null,
        href: "https://localhost/login",
        referrer: "https://localhost",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Coupon creation before deletion
  const couponCreateBody = {
    code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    type: "percentage",
    discount_value: 15,
    start_date: new Date(Date.now() - 86400000).toISOString(), // started 1 day ago
    end_date: new Date(Date.now() + 86400000 * 7).toISOString(), // ends after 7 days
  } satisfies IShoppingMallCoupon.ICreate;

  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.coupons.create(connection, {
      body: couponCreateBody,
    });
  typia.assert(createdCoupon);

  // Step 3: Delete the created coupon by its code
  await api.functional.shoppingMall.admin.coupons.erase(connection, {
    couponCode: createdCoupon.code,
  });
  // No explicit return, if no errors all passes
}
