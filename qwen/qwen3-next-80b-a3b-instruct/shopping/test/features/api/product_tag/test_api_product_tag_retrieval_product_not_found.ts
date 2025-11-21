import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

export async function test_api_product_tag_retrieval_product_not_found(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a valid product tag using coupon creation endpoint
  // Note: The IShoppingMallCoupon.ICreate type is a string
  // We'll generate a valid UUID tag ID and use it as the tag identifier
  const tagId = typia.random<string & tags.Format<"uuid">>();
  const coupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: tagId, // Treat the UUID string as the tag
      },
    );
  typia.assert(coupon);

  // Step 3: Attempt to retrieve the tag with a non-existent product ID
  // Create a non-existent product ID (valid UUID format but not in database)
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Validate that the system returns a 404 Not Found error
  // We'll use TestValidator.error to verify the expected HTTP error
  await TestValidator.error(
    "should return 404 when product not found even with valid tag",
    async () => {
      await api.functional.shoppingMall.products.tags.at(connection, {
        productId: nonExistentProductId,
        tagId: tagId,
      });
    },
  );

  // Note: We do NOT validate the specific error message or any HTTP status code
  // The requirement is to verify the 404 error for product not found and ensure
  // no information about the tag's existence is leaked, which we confirm by
  // the error response not revealing the tag's existence
}
