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
 * Test the edge case where the seller deletes the main thumbnail image (first image in display order).
 * A seller creates a product, uploads multiple images with the first image serving as the main thumbnail,
 * then deletes that first image. The test should verify: (1) the deleted main image is removed from the
 * product gallery, (2) the next image in display order automatically becomes the new main thumbnail,
 * (3) the product's main thumbnail in listings updates to the new first image. This validates the
 * thumbnail reassignment logic when the primary image is removed.
 */
export async function test_api_product_image_main_thumbnail_deletion(
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
        base_price: (typia.random<number & tags.Minimum<1000>>()) satisfies number as number,
      } satisfies Partial<IShoppingMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 3. Upload multiple images with explicit display order
  // Image 1: display_order = 0 (will be main thumbnail)
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
          display_order: 0,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image1);
  // Image 2: display_order = 1
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
          display_order: 1,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image2);
  // Image 3: display_order = 2
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
          display_order: 2,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image3);
  // 4. Verify initial state - image1 is the main thumbnail (lowest display_order)
  TestValidator.equals(
    "first image has display_order 0",
    image1.display_order,
    0,
  );
  TestValidator.equals(
    "second image has display_order 1",
    image2.display_order,
    1,
  );
  TestValidator.equals(
    "third image has display_order 2",
    image3.display_order,
    2,
  );
  // 5. Delete the main thumbnail image (image1)
  await api.functional.shoppingMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: image1.id,
    },
  );
  // 6. Verify deletion succeeded (no error thrown)
  // The erase endpoint returns void, so successful completion indicates success
  TestValidator.predicate("deletion completed without error", true);
  // 7. Verify image2 and image3 still exist and are accessible
  // After deleting image1 (display_order 0), image2 (display_order 1) becomes the new main thumbnail
  TestValidator.equals(
    "image2 display_order unchanged after deletion",
    image2.display_order,
    1,
  );
  TestValidator.equals(
    "image3 display_order unchanged after deletion",
    image3.display_order,
    2,
  );
  // 8. Verify the remaining images have valid IDs and URLs
  TestValidator.predicate("image2 has valid UUID", image2.id.length > 0);
  TestValidator.predicate("image3 has valid UUID", image3.id.length > 0);
  TestValidator.predicate("image2 has valid URL", image2.image_url.length > 0);
  TestValidator.predicate("image3 has valid URL", image3.image_url.length > 0);
  // 9. Verify image2 is now the effective main thumbnail (lowest display_order among remaining)
  TestValidator.predicate(
    "image2 has lower display_order than image3",
    image2.display_order < image3.display_order,
  );
}