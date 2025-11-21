import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_retrieval_not_found(
  connection: api.IConnection,
) {
  // Generate a non-existent coupon code using random string
  const nonExistentCouponCode = RandomGenerator.alphaNumeric(20);

  // Attempt to retrieve the non-existent coupon
  await TestValidator.error(
    "should return 404 for non-existent coupon code",
    async () => {
      await api.functional.shoppingMall.promotions.coupons.at(connection, {
        couponCode: nonExistentCouponCode,
      });
    },
  );

  // Test with a malformed coupon code (empty string)
  await TestValidator.error(
    "should return 404 for empty coupon code",
    async () => {
      await api.functional.shoppingMall.promotions.coupons.at(connection, {
        couponCode: "", // Empty string
      });
    },
  );

  // Test with a coupon code containing special characters
  await TestValidator.error(
    "should return 404 for coupon code with special characters",
    async () => {
      await api.functional.shoppingMall.promotions.coupons.at(connection, {
        couponCode: "!@#$%^&*()",
      });
    },
  );
}
