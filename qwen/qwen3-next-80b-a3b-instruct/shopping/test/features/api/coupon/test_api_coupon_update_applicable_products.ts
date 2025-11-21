import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_update_applicable_products(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePassword123";
  const adminFirstName = RandomGenerator.name();
  const adminLastName = RandomGenerator.name();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: adminFirstName,
        last_name: adminLastName,
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a coupon (body is a string containing the coupon code)
  const couponCode = RandomGenerator.alphaNumeric(8);

  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: couponCode, // IShoppingMallCoupon.ICreate is type string
      },
    );
  typia.assert(createdCoupon);
  TestValidator.equals(
    "created coupon code matches",
    createdCoupon,
    couponCode,
  );

  // Step 3: Update the coupon (body is a string containing the coupon code)
  const updatedCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.update(
      connection,
      {
        couponCode: couponCode,
        body: couponCode, // IShoppingMallCoupon.IUpdate is type string
      },
    );
  typia.assert(updatedCoupon);
  TestValidator.equals(
    "updated coupon code matches",
    updatedCoupon,
    couponCode,
  );
}
