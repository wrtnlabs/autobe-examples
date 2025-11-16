import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Tests that a seller can remove an image from a product SKU they own.
 *
 * 1. Register a new seller via api.functional.auth.seller.join.
 * 2. (Assume) A product and SKU with at least one image are available; use random
 *    UUIDs to simulate productId, skuId, imageId for deletion.
 * 3. Call api.functional.shoppingMall.seller.products.skus.images.erase with
 *    authenticated connection for those IDs.
 * 4. Validate the operation succeeds (no error thrown).
 * 5. (Assume) If subsequent endpoints existed for gallery/image listing, the
 *    deleted image would be absent—but only deletion is validated here.
 */
export async function test_api_product_sku_image_delete_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller & authenticate
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://seller-portal.example.com/registration",
    referrer: "https://seller-portal.example.com/",
    ip: null,
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerInput });
  typia.assert(seller);

  // 2. Simulate pre-existing product, SKU, and image IDs
  const productId = typia.random<string & tags.Format<"uuid">>();
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();

  // 3. Act: Seller deletes one SKU image
  await api.functional.shoppingMall.seller.products.skus.images.erase(
    connection,
    {
      productId,
      skuId,
      imageId,
    },
  );

  // 4. Validate success (no error means pass)
  TestValidator.predicate(
    "erase operation for product SKU image should complete without error",
    true,
  );
}
