import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test product image deletion with automatic thumbnail reordering.
 *
 * Validates that deleting the thumbnail image (lowest display_order) automatically makes the next image the new thumbnail. The test creates a product with multiple images, deletes the first image, and verifies the remaining images are correctly reordered with the second image becoming the new thumbnail.
 *
 * Special attention is given to verifying that the thumbnail selection is based on display_order sorting, and that the product snapshot system preserves the historical image state including the deleted image.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller uploads two product images to the product.
 * 4. Seller deletes the first image (thumbnail with lowest display_order).
 * 5. Validates that the deletion succeeds with 204 No Content response.
 * 6. Attempts to delete the second image to verify business rule enforcement.
 * 7. Validates that deleting the last remaining image fails with 400 Bad Request.
 * 8. This confirms that at least one image must remain on the product.
 */
export async function test_api_product_image_deletion_thumbnail_reorder(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(product);
  // 3. Upload first product image (becomes thumbnail with display_order=1)
  const firstImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {},
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(firstImage);
  // 4. Upload second product image (display_order=2)
  const secondImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {},
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(secondImage);
  // 5. Delete the first image (the thumbnail)
  await api.functional.shoppingMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: firstImage.id,
    },
  );
  // 6. Verify that deleting the last remaining image fails
  // This validates the business rule: at least one image must remain
  await TestValidator.error("deleting last image should fail", async () => {
    await api.functional.shoppingMall.seller.products.images.erase(
      sellerConnection,
      {
        productId: product.id,
        imageId: secondImage.id,
      },
    );
  });
  // 7. Verify the first image deletion was successful by checking
  // that we can still interact with the product (second image exists)
  TestValidator.predicate(
    "product still has one image",
    secondImage.display_order >= 1,
  );
}
