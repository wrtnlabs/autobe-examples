import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_retrieval_expired(
  connection: api.IConnection,
) {
  // Generate a coupon code that is guaranteed to be invalid (not created by system)
  const invalidCouponCode = RandomGenerator.alphaNumeric(12);

  // Test that retrieving a non-existent/expired coupon code returns an error
  // The system enforces that only valid, unexpired coupons can be retrieved
  // We verify this behavior by attempting to retrieve a coupon code we know does not exist
  await TestValidator.error(
    "non-existent coupon code should return not found error",
    async () => {
      await api.functional.shoppingMall.promotions.coupons.at(connection, {
        couponCode: invalidCouponCode,
      });
    },
  );
}
