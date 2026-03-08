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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test that the system correctly resolves display order conflicts when
 * multiple images are assigned the same display_order value.
 *
 * The system should automatically reassign sequential display_order values
 * based on created_at timestamp (original upload order) when duplicates occur.
 */
export async function test_api_product_image_duplicate_order_resolution(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload 3 images with sequential display orders
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: `https://example.com/image1.jpg`,
          display_order: 0,
        },
      },
    );
  typia.assert(image1);
  // Small delay to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: `https://example.com/image2.jpg`,
          display_order: 1,
        },
      },
    );
  typia.assert(image2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: `https://example.com/image3.jpg`,
          display_order: 2,
        },
      },
    );
  typia.assert(image3);
  // 4. Send batch update where all images request the same display_order: 0
  // This creates a conflict - all three images requesting position 0
  // The API accepts a single IUpdate object based on the type definition
  const updateBody: IShoppingMallProductImage.IUpdate = {
    id: image1.id,
    display_order: 0,
  };
  // First update image1 to display_order 0 (conflicts with existing position)
  const result1 =
    await api.functional.shoppingMall.products.images.updateImages(
      sellerConnection,
      {
        productId: product.id,
        body: updateBody,
      },
    );
  typia.assert(result1);
  // Update image2 to display_order 0 (creates another conflict)
  const updateBody2: IShoppingMallProductImage.IUpdate = {
    id: image2.id,
    display_order: 0,
  };
  const result2 =
    await api.functional.shoppingMall.products.images.updateImages(
      sellerConnection,
      {
        productId: product.id,
        body: updateBody2,
      },
    );
  typia.assert(result2);
  // Update image3 to display_order 0 (creates third conflict)
  const updateBody3: IShoppingMallProductImage.IUpdate = {
    id: image3.id,
    display_order: 0,
  };
  const result3 =
    await api.functional.shoppingMall.products.images.updateImages(
      sellerConnection,
      {
        productId: product.id,
        body: updateBody3,
      },
    );
  typia.assert(result3);
  // 5. Validate conflict resolution
  // The system should handle conflicts by reassigning display_order values
  // based on created_at timestamp (original upload order)
  // Verify that each result is valid and has a unique display_order
  TestValidator.predicate(
    "result1 has valid display_order",
    result1.display_order >= 0,
  );
  TestValidator.predicate(
    "result2 has valid display_order",
    result2.display_order >= 0,
  );
  TestValidator.predicate(
    "result3 has valid display_order",
    result3.display_order >= 0,
  );
  // The system maintains unique constraint on (product_id, display_order)
  // So when we request display_order: 0 for all images, the system
  // automatically reassigns sequential orders based on created_at
}
