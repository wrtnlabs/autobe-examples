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

export async function test_api_product_images_batch_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
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
  // 3. Upload 3 images with initial display orders (0, 1, 2)
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"url">>(),
          displayOrder: 0,
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"url">>(),
          displayOrder: 1,
        },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"url">>(),
          displayOrder: 2,
        },
      },
    );
  typia.assert(image3);
  // Store original image IDs for verification
  const originalImageIds = [image1.id, image2.id, image3.id];
  // 4. Reorder images by swapping positions
  // Original: image1(0), image2(1), image3(2)
  // New: image3(0), image1(1), image2(2)
  const reorderRequests: IShoppingMallProductImage.IUpdate[] = [
    { id: image3.id, display_order: 0 },
    { id: image1.id, display_order: 1 },
    { id: image2.id, display_order: 2 },
  ];
  const updatedImages: IShoppingMallProductImage[] = [];
  for (const request of reorderRequests) {
    const updated = await api.functional.shoppingMall.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        body: request,
      },
    );
    typia.assert(updated);
    updatedImages.push(updated);
  }
  // 5. Verify the reordered images - all image IDs are present
  const updatedImageIds = updatedImages.map((img) => img.id);
  TestValidator.equals(
    "all images present after reorder",
    originalImageIds.sort(),
    updatedImageIds.sort(),
  );
  // 6. Verify ordering is correct (ascending by display_order)
  const sortedImages = [...updatedImages].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  TestValidator.equals(
    "images sorted by displayOrder",
    sortedImages.map((img) => img.displayOrder),
    [0, 1, 2],
  );
  // 7. Verify the image with lowest display_order (image3) is now first
  TestValidator.equals("first image is image3", sortedImages[0].id, image3.id);
}