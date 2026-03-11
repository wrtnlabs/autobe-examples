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
 * Test uploading multiple images to a product and verify automatic sequential
 * display order assignment.
 *
 * This test validates that when uploading images without specifying display_order,
 * the system automatically assigns sequential values starting from 0.
 */
export async function test_api_product_image_multiple_upload_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
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
  // 3. Upload first image WITHOUT displayOrder
  // System should auto-assign displayOrder = 0 (no existing images)
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          // Not specifying displayOrder - system should auto-assign
          imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
        },
      },
    );
  typia.assert(image1);
  TestValidator.equals("first image displayOrder", image1.displayOrder, 0);
  // 4. Upload second image WITHOUT displayOrder
  // System should auto-assign displayOrder = 1 (MAX(0) + 1)
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          // Not specifying displayOrder - system should auto-assign
          imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
        },
      },
    );
  typia.assert(image2);
  TestValidator.equals("second image displayOrder", image2.displayOrder, 1);
  // 5. Upload third image WITHOUT displayOrder
  // System should auto-assign displayOrder = 2 (MAX(1) + 1)
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          // Not specifying displayOrder - system should auto-assign
          imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
        },
      },
    );
  typia.assert(image3);
  TestValidator.equals("third image displayOrder", image3.displayOrder, 2);
  // 6. Validate ordering by verifying display_order values
  TestValidator.predicate(
    "display orders are sequential",
    image1.displayOrder < image2.displayOrder &&
      image2.displayOrder < image3.displayOrder,
  );
  TestValidator.predicate(
    "image IDs are unique",
    image1.id !== image2.id &&
      image2.id !== image3.id &&
      image1.id !== image3.id,
  );
}
