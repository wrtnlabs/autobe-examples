import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_retrieval_deactivated(
  connection: api.IConnection,
) {
  const invalidCouponCode = RandomGenerator.alphaNumeric(16);

  // Attempt to retrieve a non-existent coupon code, which should return a 404 error
  await TestValidator.error(
    "non-existent coupon code should return 404 error",
    async () => {
      await api.functional.shoppingMall.promotions.coupons.at(connection, {
        couponCode: invalidCouponCode,
      });
    },
  );
}
