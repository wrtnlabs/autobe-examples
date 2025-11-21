import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

export async function test_api_product_tag_retrieval_product_id_invalid_format(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account for authentication
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a valid coupon to ensure authentication context is retained
  const coupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: "VALIDCOUPON123" satisfies IShoppingMallCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // Step 3: Try to retrieve a product tag with invalid productId format
  // We use an invalid UUID format "invalid-uuid" to test the API's input validation
  await TestValidator.error(
    "should reject malformed productId format",
    async () => {
      await api.functional.shoppingMall.products.tags.at(connection, {
        productId: "invalid-uuid",
        tagId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
