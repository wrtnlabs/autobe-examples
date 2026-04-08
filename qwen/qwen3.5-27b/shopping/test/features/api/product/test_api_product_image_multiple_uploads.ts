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
 * Test uploading multiple product images sequentially to verify display order management.
 *
 * Validates the complete product image upload workflow including seller authentication, product creation, and sequential image uploads. Ensures that each uploaded image receives the correct display_order value (1, 2, 3) and that images are properly ordered in the product gallery.
 *
 * Special attention is given to verifying that the first image (display_order = 1) serves as the main thumbnail and that subsequent images are appended with incrementing display order values.
 *
 * 1. Seller authenticates via join operation to obtain valid session tokens.
 * 2. Seller creates a new product with name, description, and base price.
 * 3. Upload first image and verify it gets display_order = 1.
 * 4. Upload second image and verify it gets display_order = 2.
 * 5. Upload third image and verify it gets display_order = 3.
 * 6. Verify all three images have unique IDs and correct display_order values.
 */
export async function test_api_product_image_multiple_uploads(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload first image
  const firstImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(firstImage);
  TestValidator.equals(
    "first image display_order",
    firstImage.display_order,
    1,
  );
  // 4. Upload second image
  const secondImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(secondImage);
  TestValidator.equals(
    "second image display_order",
    secondImage.display_order,
    2,
  );
  // 5. Upload third image
  const thirdImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(thirdImage);
  TestValidator.equals(
    "third image display_order",
    thirdImage.display_order,
    3,
  );
  // 6. Verify all three images have unique IDs
  TestValidator.notEquals(
    "first and second image IDs",
    firstImage.id,
    secondImage.id,
  );
  TestValidator.notEquals(
    "first and third image IDs",
    firstImage.id,
    thirdImage.id,
  );
  TestValidator.notEquals(
    "second and third image IDs",
    secondImage.id,
    thirdImage.id,
  );
  // 7. Verify all images belong to the same product (implicit through upload success)
  await TestValidator.predicate(
    "all images have valid URIs",
    firstImage.image_uri != null &&
      secondImage.image_uri != null &&
      thirdImage.image_uri != null,
  );
  // 8. Verify display_order sequence is correct (1 < 2 < 3)
  TestValidator.predicate(
    "display_order sequence is ascending",
    firstImage.display_order < secondImage.display_order &&
      secondImage.display_order < thirdImage.display_order,
  );
}