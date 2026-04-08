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
 * Test that an authenticated seller can retrieve detailed information about a product image they own.
 *
 * Validates the product image retrieval workflow for sellers, ensuring that image metadata is correctly returned with proper typing and format validation. Tests the complete flow from seller registration through product creation, image upload, and image retrieval.
 *
 * Special attention is given to verifying that the retrieved image matches the uploaded image data and that all required fields are present in the response.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller uploads an image to the product.
 * 4. Seller retrieves the specific product image by product ID and image ID.
 * 5. Validates that all image metadata fields match the uploaded image data.
 */
export async function test_api_product_image_retrieve_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload an image to the product
  const image =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image);
  // 4. Retrieve the specific product image
  const retrievedImage =
    await api.functional.shoppingMall.seller.products.images.at(
      sellerConnection,
      {
        productId: product.id,
        imageId: image.id,
      },
    );
  typia.assert(retrievedImage);
  // 5. Validate image metadata matches uploaded data
  TestValidator.equals(
    "image URI matches uploaded",
    retrievedImage.image_uri,
    image.image_uri,
  );
  TestValidator.equals(
    "display order matches",
    retrievedImage.display_order,
    image.display_order,
  );
  TestValidator.equals(
    "created_at timestamp matches",
    retrievedImage.created_at,
    image.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp matches",
    retrievedImage.updated_at,
    image.updated_at,
  );
  TestValidator.equals("image ID matches", retrievedImage.id, image.id);
}
