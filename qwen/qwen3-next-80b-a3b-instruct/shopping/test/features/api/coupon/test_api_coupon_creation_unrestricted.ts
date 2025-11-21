import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_creation_unrestricted(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin by creating a new admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create an unrestricted coupon with null application scope
  // This tests the scenario where both applicable_to_categories and applicable_to_products are null
  // which should result in a coupon applicable to all customers and products
  const couponCode: string = typia.random<string & tags.Format<"uuid">>();
  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: couponCode satisfies IShoppingMallCoupon.ICreate,
      },
    );
  typia.assert(createdCoupon);

  // Step 3: Validate that the created coupon matches the input code
  TestValidator.equals(
    "coupon code matches created coupon",
    createdCoupon,
    couponCode,
  );
}
