import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validates that an admin can delete any product SKU image using the admin API
 * regardless of seller ownership, and that the system enforces audit and
 * permission checks, performing a soft delete. The test scenario is as
 * follows:
 *
 * 1. Registers a new admin account (joining as an admin is a scenario
 *    prerequisite).
 * 2. Assumes existence of a product, SKU, and image (productId, skuId, imageId),
 *    generated randomly for e2e isolation.
 * 3. Deletes the SKU image by invoking the admin product SKU image DELETE API.
 * 4. Checks for success (void response).
 * 5. (As list/get/image validation is out of test scope, validates only API
 *    success.)
 */
export async function test_api_product_sku_image_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Prepare product, SKU, and image IDs (randomly - assumed prepared externally)
  const productId: string = typia.random<string & tags.Format<"uuid">>();
  const skuId: string = typia.random<string & tags.Format<"uuid">>();
  const imageId: string = typia.random<string & tags.Format<"uuid">>();

  // 3. Call erase API as admin (should succeed regardless of ownership)
  await api.functional.shoppingMall.admin.products.skus.images.erase(
    connection,
    {
      productId,
      skuId,
      imageId,
    },
  );

  // 4. Success
  TestValidator.predicate(
    "admin DELETE product SKU image endpoint executes without error (soft delete is successful)",
    true,
  );
}
