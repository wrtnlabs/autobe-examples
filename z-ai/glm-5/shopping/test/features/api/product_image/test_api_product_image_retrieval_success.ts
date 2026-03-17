import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test the successful retrieval of an existing product image.
 * 1. Seller creates an account and logs in
 * 2. Seller creates a product
 * 3. Seller uploads an image to the product
 * 4. Unauthenticated user retrieves the image details
 * 5. Validate all response fields match expected values
 */
export async function test_api_product_image_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Upload an image to the product
  const image =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(image);
  // 4. Retrieve the image (as unauthenticated customer)
  const customerConnection: api.IConnection = { host: connection.host };
  const retrievedImage = await api.functional.shoppingMall.products.images.at(
    customerConnection,
    {
      productId: product.id,
      imageId: image.id,
    },
  );
  typia.assert(retrievedImage);
  // 5. Validate response fields
  TestValidator.equals("image id matches", retrievedImage.id, image.id);
  TestValidator.equals(
    "product id matches",
    retrievedImage.product.id,
    product.id,
  );
  TestValidator.equals(
    "imageUrl matches",
    retrievedImage.imageUrl,
    image.imageUrl,
  );
  TestValidator.equals(
    "displayOrder matches",
    retrievedImage.displayOrder,
    image.displayOrder,
  );
  TestValidator.equals(
    "createdAt matches",
    retrievedImage.createdAt,
    image.createdAt,
  );
  // Validate product summary fields
  TestValidator.equals(
    "product name matches",
    retrievedImage.product.name,
    product.name,
  );
  TestValidator.equals(
    "product base_price matches",
    retrievedImage.product.base_price,
    product.base_price,
  );
}
