import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_coupon_deletion_non_admin_access(
  connection: api.IConnection,
) {
  const couponCode = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error("non-admin user cannot delete coupon", async () => {
    await api.functional.shoppingMall.admin.promotions.coupons.erase(
      connection,
      {
        couponCode,
      },
    );
  });
}
