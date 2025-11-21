import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_retrieval_case_insensitive(
  connection: api.IConnection,
) {
  // Generate a random coupon code (string matching IShoppingMallCoupon) that exists in the system
  const baseCode = typia.random<IShoppingMallCoupon>();

  // Test case-insensitive lookup with all uppercase version
  const upperCode = baseCode.toUpperCase();
  const resultUpper = await api.functional.shoppingMall.promotions.coupons.at(
    connection,
    {
      couponCode: upperCode,
    },
  );
  typia.assert(resultUpper);
  TestValidator.equals("case-insensitive match upper", resultUpper, baseCode);

  // Test case-insensitive lookup with all lowercase version
  const lowerCode = baseCode.toLowerCase();
  const resultLower = await api.functional.shoppingMall.promotions.coupons.at(
    connection,
    {
      couponCode: lowerCode,
    },
  );
  typia.assert(resultLower);
  TestValidator.equals("case-insensitive match lower", resultLower, baseCode);

  // Test case-insensitive lookup with original mixed case
  const resultMixed = await api.functional.shoppingMall.promotions.coupons.at(
    connection,
    {
      couponCode: baseCode,
    },
  );
  typia.assert(resultMixed);
  TestValidator.equals(
    "case-insensitive match original",
    resultMixed,
    baseCode,
  );
}
