import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_retrieval_valid(
  connection: api.IConnection,
) {
  const couponCode: string = typia.random<
    string & tags.Pattern<"^[A-Za-z0-9]{8,20}$">
  >();
  const coupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.promotions.coupons.at(connection, {
      couponCode,
    });
  typia.assert(coupon);
}
