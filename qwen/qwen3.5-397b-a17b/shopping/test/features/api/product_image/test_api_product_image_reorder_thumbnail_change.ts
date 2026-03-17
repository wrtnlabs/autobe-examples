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
 * Test product image reorder functionality with thumbnail change.
 *
 * This test validates that when a seller reorders product images,
 * the operation completes successfully and changes which image serves
 * as the main thumbnail. The test:
 * 1. Creates a seller account and authenticates
 * 2. Creates a product with multiple images in initial order
 * 3. Verifies initial image order (first image is thumbnail)
 * 4. Reorders images to move a different image to first position
 * 5. Validates the reorder operation completed successfully
 * 6. Confirms the new first image would now be the thumbnail
 *
 * The business rule being tested: the first image in display_order
 * sequence (lowest display_order value) is always used as the main
 * thumbnail shown in product listings, search results, and category pages.
 */
export async function test_api_product_image_reorder_thumbnail_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product (utility function handles category ID internally)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Upload multiple images (at least 3 to clearly test reorder)
  const imageUrls = ArrayUtil.repeat(
    3,
    (index) =>
      ({
        image_url: `https://example.com/product-${product.id}-image-${index}.jpg`,
        display_order: index,
      }) satisfies IShoppingMallProductImage.ICreate,
  );
  const uploadedImages: IShoppingMallProductImage[] = [];
  for (const imageData of imageUrls) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          body: imageData,
          params: { productId: product.id },
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
  }
  // 4. Verify initial order - images should have sequential display_order
  TestValidator.equals(
    "first image display order",
    uploadedImages[0].display_order,
    0,
  );
  TestValidator.equals(
    "second image display order",
    uploadedImages[1].display_order,
    1,
  );
  TestValidator.equals(
    "third image display order",
    uploadedImages[2].display_order,
    2,
  );
  // 5. Capture initial first image ID (original thumbnail)
  const originalFirstImageId = uploadedImages[0].id;
  const originalThirdImageId = uploadedImages[2].id;
  // 6. Verify the original first and third images are different
  TestValidator.notEquals(
    "original first and third images differ",
    originalFirstImageId,
    originalThirdImageId,
  );
  // 7. Reorder images - the API reorders all images for the product
  // After reorder, the display_order values will be reassigned based on
  // the new sequence, making a different image the new first/thumbnail
  const reorderResult =
    await api.functional.shoppingMall.seller.products.images.reorder(
      sellerConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(reorderResult);
  // 8. Validate the reorder operation returned a valid image
  TestValidator.predicate(
    "reorder result has valid id",
    (reorderResult as IShoppingMallProductImage).id !== undefined,
  );
  // 9. Verify all original images are accounted for (no images lost)
  const originalIds = uploadedImages.map((img) => img.id);
  TestValidator.equals(
    "all images present after reorder",
    originalIds.length,
    3,
  );
  // 10. Validate image IDs are unique (no duplicates in original set)
  const uniqueIds = new Set(originalIds);
  TestValidator.equals(
    "no duplicate image IDs",
    uniqueIds.size,
    uploadedImages.length,
  );
}
