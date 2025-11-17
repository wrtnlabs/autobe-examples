import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_customer_coupon_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins and authenticates
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: createBody });
  typia.assert(authorizedCustomer);

  // 2. Retrieve coupon using valid coupon code; for test purpose, we use a random code
  const couponCode = typia.random<string>();
  const coupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.customer.coupons.at(connection, {
      couponCode,
    });
  typia.assert(coupon);
  TestValidator.predicate(
    "valid coupon code - code matches",
    coupon.code === couponCode,
  );
  TestValidator.predicate(
    "valid coupon code - discount_value non-negative",
    coupon.discount_value >= 0,
  );
  TestValidator.predicate(
    "valid coupon code - start_date before or equal to end_date",
    coupon.start_date <= coupon.end_date,
  );

  // 3. Test error handling: invalid coupon code returns error
  const invalidCouponCode = "invalid_coupon_code_1234567890";
  await TestValidator.error(
    "invalid coupon code should cause error",
    async () => {
      await api.functional.shoppingMall.customer.coupons.at(connection, {
        couponCode: invalidCouponCode,
      });
    },
  );
}
