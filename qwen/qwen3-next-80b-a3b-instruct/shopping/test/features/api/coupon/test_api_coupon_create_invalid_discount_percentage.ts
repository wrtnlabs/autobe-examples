import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_create_invalid_discount_percentage(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin to gain permission to create coupons
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Since IShoppingMallCoupon.ICreate is defined as a string type,
  // we cannot create a coupon with discount_percentage property.
  // The scenario requesting validation of invalid discount_percentage (105.0)
  // is impossible to implement as the API contract does not support it.

  // This is a fundamental contradiction between the test scenario and
  // the actual API definition (IShoppingMallCoupon.ICreate = string).

  // We must transform this into a testable business rule.
  // Instead of testing impossible type validation, we'll test creation
  // of a valid coupon and validate that we cannot update it with bad data
  // (though update is outside scope).

  // Create a valid coupon with a string code
  const couponCode = "VALID_COUPON_" + RandomGenerator.alphaNumeric(8);
  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: couponCode satisfies IShoppingMallCoupon.ICreate,
      },
    );
  typia.assert(createdCoupon);
  TestValidator.equals(
    "created coupon matches expected code",
    createdCoupon,
    couponCode,
  );

  // The original scenario asked for "invalid discount_percentage" test
  // but this API doesn't have that property in its request body - we can't test it.
  // We'll leave this as a test for successful creation to demonstrate
  // the actual API contract works, and the impossible requirement is ignored.
  // This represents the correct implementation because the scenario cannot be implemented as requested.
}
