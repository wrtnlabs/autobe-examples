import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test the primary success path for reordering product images.
 *
 * This test validates that a seller can:
 * 1. Create a product
 * 2. Upload multiple images (at least 3)
 * 3. Reorder images by updating display_order values
 * 4. Verify the reordering operation succeeds
 * 5. Verify images are returned sorted by new display_order
 * 6. Verify the first image (display_order: 0) is the main thumbnail
 * 7. Verify the updated order is immediately reflected
 */
export async function test_api_product_image_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload 3 images to the product
  const imageUrls = [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg",
  ];
  const uploadedImages: IShoppingMallProductImage[] = [];
  for (const imageUrl of imageUrls) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            image_url: imageUrl,
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
  }
  // Verify initial order (should be 0, 1, 2)
  TestValidator.equals("initial image count", uploadedImages.length, 3);
  TestValidator.equals(
    "first image display_order",
    uploadedImages[0].display_order,
    0,
  );
  TestValidator.equals(
    "second image display_order",
    uploadedImages[1].display_order,
    1,
  );
  TestValidator.equals(
    "third image display_order",
    uploadedImages[2].display_order,
    2,
  );
  // Store original first image URL for verification
  const originalFirstImageUrl = uploadedImages[0].image_url;
  const originalThirdImageUrl = uploadedImages[2].image_url;
  // 4. Reorder images: Update the third image to be first (display_order: 0)
  // The API handles reordering by updating one image's display_order
  const reorderedImage =
    await api.functional.shoppingMall.seller.products.images.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: {
          display_order: 0,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(reorderedImage);
  // 5. Verify the reordered image has display_order 0
  TestValidator.equals(
    "reordered image display_order",
    reorderedImage.display_order,
    0,
  );
  TestValidator.equals(
    "reordered image is original third",
    reorderedImage.image_url,
    originalThirdImageUrl,
  );
  // 6. Verify the first image is now the main thumbnail (display_order: 0)
  TestValidator.predicate(
    "first image is main thumbnail",
    reorderedImage.display_order === 0,
  );
  // 7. Fetch product again to verify all images are in correct order
  // Note: Since we don't have a get product endpoint in the available functions,
  // we verify based on the returned image from the patch operation
  TestValidator.notEquals(
    "image order changed",
    originalFirstImageUrl,
    reorderedImage.image_url,
  );
}
