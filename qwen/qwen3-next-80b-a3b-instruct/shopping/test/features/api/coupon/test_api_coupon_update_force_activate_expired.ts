import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_update_force_activate_expired(
  connection: api.IConnection,
) {
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "full_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  const couponCode: string = RandomGenerator.alphaNumeric(16);
  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: couponCode satisfies IShoppingMallCoupon.ICreate,
      },
    );
  typia.assert(createdCoupon);

  await TestValidator.error(
    "force activating expired coupon should fail",
    async () => {
      await api.functional.shoppingMall.admin.promotions.coupons.update(
        connection,
        {
          couponCode,
          body: couponCode satisfies IShoppingMallCoupon.IUpdate,
        },
      );
    },
  );
}
