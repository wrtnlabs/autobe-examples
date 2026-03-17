import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test retrieving a specific product image that exists and is active.
 *
 * Test Flow:
 * 1. Seller registers and gets authenticated
 * 2. Seller creates a product
 * 3. Seller uploads multiple images to the product
 * 4. Any user (public) retrieves a specific image by productId and imageId
 * 5. Validate image details and nested product information
 */
export async function test_api_product_image_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload multiple images to the product
  const imageCount = 3;
  const images: IShoppingMallProductImage[] = [];
  for (let i = 0; i < imageCount; i++) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            image_url: typia.random<string & tags.Format<"uri">>(),
            display_order: i,
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    typia.assert(image);
    images.push(image);
  }
  // 4. Retrieve a specific image (use the second image)
  const targetImage = images[1];
  const retrievedImage = await api.functional.shoppingMall.products.images.at(
    connection,
    {
      productId: product.id,
      imageId: targetImage.id,
    },
  );
  typia.assert(retrievedImage);
  // 5. Validate the retrieved image matches the target
  TestValidator.equals("image id matches", retrievedImage.id, targetImage.id);
  TestValidator.equals(
    "display_order matches",
    retrievedImage.display_order,
    targetImage.display_order,
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    retrievedImage.deleted_at,
    null,
  );
  // 6. Validate nested product information matches
  TestValidator.equals(
    "product id matches",
    retrievedImage.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedImage.product.name,
    product.name,
  );
  TestValidator.equals(
    "product basePrice matches",
    retrievedImage.product.basePrice,
    product.base_price,
  );
  TestValidator.equals(
    "product seller id matches",
    retrievedImage.product.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "product seller shop_name matches",
    retrievedImage.product.seller.shop_name,
    sellerAuth.shop_name,
  );
}
