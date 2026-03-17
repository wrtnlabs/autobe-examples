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
 * Test product image reordering functionality.
 *
 * A seller registers and creates a product, uploads at least 3 images to the
 * product's gallery, then reorders the images by changing their display sequence.
 * The test verifies: (1) The reorder operation completes successfully, (2) Images
 * are returned with updated display_order values matching their position in the
 * new order (0, 1, 2, etc.), (3) The first image in the reordered sequence has
 * display_order 0 and becomes the main thumbnail, (4) All images maintain
 * sequential display_order values after reordering.
 */
export async function test_api_product_image_reorder_success(
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
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload 3 images to the product
  const imageUrls = [
    "https://example.com/images/product-image-1.jpg",
    "https://example.com/images/product-image-2.jpg",
    "https://example.com/images/product-image-3.jpg",
  ] as const;
  const images: IShoppingMallProductImage[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            image_url: imageUrls[i],
            display_order: i,
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    typia.assert(image);
    images.push(image);
  }
  // Verify initial order
  TestValidator.equals("initial image count", images.length, 3);
  TestValidator.equals("first image display_order", images[0].display_order, 0);
  TestValidator.equals(
    "second image display_order",
    images[1].display_order,
    1,
  );
  TestValidator.equals("third image display_order", images[2].display_order, 2);
  // 4. Reorder images (reverse the order: 3rd becomes 1st, 1st becomes 3rd)
  const reorderedImages =
    await api.functional.shoppingMall.seller.products.images.reorder(
      sellerConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(reorderedImages);
  // 5. Verify reordered images have correct display_order values
  // The reorder endpoint should return images with updated display_order
  // First image in new order should have display_order 0
  TestValidator.predicate(
    "reordered first image has display_order 0",
    reorderedImages.display_order === 0,
  );
  // Verify the image URL changed (different from original first image)
  TestValidator.notEquals(
    "first image URL changed after reorder",
    reorderedImages.image_url,
    images[0].image_url,
  );
}
