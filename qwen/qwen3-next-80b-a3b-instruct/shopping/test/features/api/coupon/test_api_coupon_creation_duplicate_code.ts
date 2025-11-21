import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_creation_duplicate_code(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a coupon with a unique code
  const couponCode1 = RandomGenerator.alphaNumeric(8);
  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: couponCode1 satisfies IShoppingMallCoupon.ICreate,
      },
    );
  typia.assert(createdCoupon);
  TestValidator.equals(
    "created coupon code matches",
    createdCoupon,
    couponCode1,
  );

  // Step 3: Attempt to create a duplicate coupon with the same code
  await TestValidator.error(
    "duplicate coupon code should fail with 409 conflict",
    async () => {
      await api.functional.shoppingMall.admin.promotions.coupons.create(
        connection,
        {
          body: couponCode1 satisfies IShoppingMallCoupon.ICreate,
        },
      );
    },
  );
}
