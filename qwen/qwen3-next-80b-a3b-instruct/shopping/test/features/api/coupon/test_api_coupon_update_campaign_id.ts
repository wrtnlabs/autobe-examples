import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_update_campaign_id(
  connection: api.IConnection,
) {
  // Authenticate as admin to establish authorization context
  const adminCredentials = typia.random<IShoppingMallAdmin.ICreate>();
  const authenticatedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCredentials satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(authenticatedAdmin);

  // Create a coupon with a string code (ICreate is string type)
  const originalCouponCode = RandomGenerator.alphabets(10);
  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: originalCouponCode satisfies IShoppingMallCoupon.ICreate,
      },
    );
  typia.assert(createdCoupon);
  TestValidator.equals(
    "created coupon code matches",
    createdCoupon,
    originalCouponCode,
  );

  // Update the coupon with a different string code (IUpdate is string type)
  const newCouponCode = RandomGenerator.alphabets(10);
  const updatedCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.update(
      connection,
      {
        couponCode: originalCouponCode,
        body: newCouponCode satisfies IShoppingMallCoupon.IUpdate,
      },
    );
  typia.assert(updatedCoupon);
  TestValidator.equals(
    "updated coupon code matches",
    updatedCoupon,
    newCouponCode,
  );
}
