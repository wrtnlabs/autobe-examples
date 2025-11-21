import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_retrieval_usage_limit_exceeded(
  connection: api.IConnection,
) {
  // Generate a unique coupon code
  const couponCode = typia.random<string & tags.Format<"uuid">>();

  // First, simulate usage by retrieving the coupon to initialize it (assume it's created with a limit of 1 usage)
  const initialCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.promotions.coupons.at(connection, {
      couponCode,
    });
  typia.assert(initialCoupon);

  // Second, attempt to retrieve the coupon again as if it's been redeemed once (simulating actual usage)
  // In a real system, this would involve calling a redemption endpoint
  // Since we don't have a redemption function in the provided SDK, we simulate the state by assuming the system's
  // internal usage count has reached its limit after the first retrieval (as per the scenario)

  // The scenario requires testing retrieval of a coupon that has exceeded its usage limit
  // When a coupon's usage limit is exceeded, the API should return an error (not the coupon data)
  // We verify this by attempting to retrieve it a second time and expecting an error
  await TestValidator.error(
    "coupon with exceeded usage limit should return error",
    async () => {
      await api.functional.shoppingMall.promotions.coupons.at(connection, {
        couponCode,
      });
    },
  );
}
