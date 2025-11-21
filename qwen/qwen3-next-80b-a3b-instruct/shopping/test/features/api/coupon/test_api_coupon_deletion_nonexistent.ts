import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_coupon_deletion_nonexistent(
  connection: api.IConnection,
) {
  // Authenticate as admin to gain permissions for coupon deletion
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

  // Attempt to delete a non-existent coupon with a random coupon code
  // This should return a 404 error as the coupon doesn't exist and shouldn't modify any data
  await TestValidator.error(
    "deletion of non-existent coupon should fail with 404",
    async () => {
      await api.functional.shoppingMall.admin.promotions.coupons.erase(
        connection,
        {
          couponCode: "NON-EXISTENT-COUPON-12345", // No format specified in schema, using random string
        },
      );
    },
  );
}
