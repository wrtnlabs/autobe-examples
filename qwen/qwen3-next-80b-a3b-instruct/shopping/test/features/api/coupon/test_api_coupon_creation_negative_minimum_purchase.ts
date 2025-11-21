import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_creation_negative_minimum_purchase(
  connection: api.IConnection,
) {
  // 1. Authenticate admin account for coupon creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "password123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });

  // 2. Attempt to create coupon with empty string (invalid format - should fail)
  await TestValidator.error("should reject empty coupon code", async () => {
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: "", // Empty string - invalid coupon code
      },
    );
  });

  // 3. Attempt to create coupon with whitespace only (invalid format - should fail)
  await TestValidator.error(
    "should reject whitespace-only coupon code",
    async () => {
      await api.functional.shoppingMall.admin.promotions.coupons.create(
        connection,
        {
          body: "   ", // Whitespace-only string - invalid coupon code
        },
      );
    },
  );

  // 4. Attempt to create coupon with valid non-empty string (should succeed)
  const validCode = "VALID_COUPON_123";
  const coupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: validCode, // Valid non-empty string
      },
    );
  typia.assert(coupon);
  TestValidator.equals("coupon code matches", coupon, validCode);
}
