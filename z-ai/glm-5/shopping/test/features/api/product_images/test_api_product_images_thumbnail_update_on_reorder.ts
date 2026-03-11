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

export async function test_api_product_images_thumbnail_update_on_reorder(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Step 2: Create a product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Step 3: Upload 2 images with specific display orders
  // Image A with display_order=0
  const imageA =
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
  typia.assert(imageA);
  // Image B with display_order=1
  const imageB =
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
  typia.assert(imageB);
  // Step 4: Verify Image A is the main thumbnail (has lowest display_order)
  TestValidator.equals("Image A has display_order 0", imageA.displayOrder, 0);
  TestValidator.equals("Image B has display_order 1", imageB.displayOrder, 1);
  TestValidator.predicate(
    "Image A is main thumbnail",
    imageA.displayOrder < imageB.displayOrder,
  );
  // Step 5: Swap display orders using sequential updates to avoid conflicts
  // First, move Image A to a temporary higher position
  await api.functional.shoppingMall.products.images.update(sellerConnection, {
    productId: product.id,
    body: {
      id: imageA.id,
      display_order: 2,
    } satisfies IShoppingMallProductImage.IUpdate,
  });
  // Then, move Image B to position 0 (now lowest)
  const updatedImageB =
    await api.functional.shoppingMall.products.images.update(sellerConnection, {
      productId: product.id,
      body: {
        id: imageB.id,
        display_order: 0,
      } satisfies IShoppingMallProductImage.IUpdate,
    });
  typia.assert(updatedImageB);
  // Finally, move Image A to position 1
  const updatedImageA =
    await api.functional.shoppingMall.products.images.update(sellerConnection, {
      productId: product.id,
      body: {
        id: imageA.id,
        display_order: 1,
      } satisfies IShoppingMallProductImage.IUpdate,
    });
  typia.assert(updatedImageA);
  // Step 6 & 7: Verify the swap worked correctly
  TestValidator.equals(
    "Image B now has display_order 0",
    updatedImageB.displayOrder,
    0,
  );
  TestValidator.equals(
    "Image A now has display_order 1",
    updatedImageA.displayOrder,
    1,
  );
  TestValidator.predicate(
    "Image B is now main thumbnail",
    updatedImageB.displayOrder < updatedImageA.displayOrder,
  );
}
