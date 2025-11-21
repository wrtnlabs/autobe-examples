import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_creation_both_discounts_invalid(
  connection: api.IConnection,
) {
  // Step 1: Authenticate admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "securePassword123";
  const adminFirstName: string = RandomGenerator.name();
  const adminLastName: string = RandomGenerator.name();
  const adminRole: "super_admin" | "full_admin" | "limited_admin" =
    "full_admin";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: adminFirstName,
        last_name: adminLastName,
        role: adminRole,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Attempt coupon creation with both discount_amount and discount_percentage (invalid scenario)
  const couponCode: string = `COUPON-${RandomGenerator.alphaNumeric(8)}`;
  const discountAmount: number = 1000;
  const discountPercentage: number = 15;

  // Expecting the API to reject this request since both discount fields cannot be provided simultaneously
  await TestValidator.error(
    "coupon creation should fail when both discount_amount and discount_percentage are provided",
    async () => {
      await api.functional.shoppingMall.admin.promotions.coupons.create(
        connection,
        {
          body: JSON.stringify({
            code: couponCode,
            discount_amount: discountAmount,
            discount_percentage: discountPercentage,
          }),
        },
      );
    },
  );
}
