import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_update_both_discount_fields(
  connection: api.IConnection,
) {
  // Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Create a coupon with discount_amount
  const couponCode: string = RandomGenerator.alphaNumeric(10);
  const createBody = {
    code: couponCode,
    discount_amount: 1000,
    status: "active",
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 86400000).toISOString(),
    max_usage_count: 10,
  };
  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: JSON.stringify(createBody) satisfies IShoppingMallCoupon.ICreate,
      },
    );
  typia.assert(createdCoupon);

  // Attempt to update coupon with both discount_amount and discount_percentage (should fail)
  await TestValidator.error(
    "updating coupon with both discount_amount and discount_percentage should fail",
    async () => {
      const updateBody = {
        discount_amount: 2000,
        discount_percentage: 10,
      };
      await api.functional.shoppingMall.admin.promotions.coupons.update(
        connection,
        {
          couponCode: couponCode,
          body: JSON.stringify(
            updateBody,
          ) satisfies IShoppingMallCoupon.IUpdate,
        },
      );
    },
  );

  // Verify coupon was not changed
  const updatedCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.update(
      connection,
      {
        couponCode: couponCode,
        body: JSON.stringify({
          discount_amount: 1000,
        }) satisfies IShoppingMallCoupon.IUpdate,
      },
    );
  typia.assert(updatedCoupon);
  TestValidator.equals("coupon code unchanged", updatedCoupon, couponCode);
}
