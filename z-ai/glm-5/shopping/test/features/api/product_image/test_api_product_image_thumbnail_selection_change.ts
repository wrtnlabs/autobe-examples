import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_seller_sellers_me_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_thumbnail_selection_change(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Step 2: Create a new product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Step 3: Upload two images with different order values
  // Image A with order 1 (will be main/thumbnail initially)
  const imageA =
    await generate_random_shopping_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          order: 1,
        },
      },
    );
  typia.assert(imageA);
  // Image B with order 2
  const imageB =
    await generate_random_shopping_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          order: 2,
        },
      },
    );
  typia.assert(imageB);
  // Verify initial state: Image A should be the main/thumbnail (lowest order)
  TestValidator.equals("initial main image is lowest order", imageA.order, 1);
  TestValidator.predicate(
    "image A has lower order than image B",
    imageA.order < imageB.order,
  );
  // Scenario 1: Change image B's order to 1 (tied for first)
  // This should make it compete for main image position
  const updatedImageB1 =
    await api.functional.shoppingMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: imageB.id,
        body: { order: 3 } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImageB1);
  // Verify the order was updated
  TestValidator.equals("image B order updated to 3", updatedImageB1.order, 3);
  // Verify Image A still has the lowest order (1), so it remains main/thumbnail
  TestValidator.equals("image A still has lowest order", imageA.order, 1);
  TestValidator.predicate(
    "image A order is lower than updated image B",
    imageA.order < updatedImageB1.order,
  );
  // Scenario 2: Change image A's order from 1 to 4 (moving it from first position)
  const updatedImageA =
    await api.functional.shoppingMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: imageA.id,
        body: { order: 4 } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImageA);
  // Verify image A's new order
  TestValidator.equals("image A order updated to 4", updatedImageA.order, 4);
  // Now image B (order 3) should become the main/thumbnail image
  // since it now has the lowest order value
  TestValidator.predicate(
    "image B now has lowest order (3 < 4)",
    updatedImageB1.order < updatedImageA.order,
  );
  // Scenario 3: Create a new image with order 1 to become the new main/thumbnail
  const imageC =
    await generate_random_shopping_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          order: 1,
        },
      },
    );
  typia.assert(imageC);
  // Verify image C now has the lowest order
  TestValidator.equals("image C has lowest order", imageC.order, 1);
  TestValidator.predicate(
    "image C order is lower than all others",
    imageC.order < updatedImageB1.order && imageC.order < updatedImageA.order,
  );
}
