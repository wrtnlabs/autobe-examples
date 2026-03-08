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

export async function test_api_product_image_first_upload_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success workflow of a seller uploading the first image
   * to their product, which automatically becomes the main thumbnail.
   *
   * Flow:
   * 1. Register a seller account
   * 2. Create a product owned by the seller
   * 3. Upload first image to the product with display_order=0
   * 4. Verify image is correctly associated with the product
   */
  // Step 1: Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Step 2: Create a product owned by the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Step 3: Upload first image to the product with display_order=0
  const imageUrl = "https://example.com/images/product-thumbnail.jpg";
  const image =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: imageUrl,
          display_order: 0,
        },
      },
    );
  typia.assert(image);
  // Step 4: Validate the image response
  TestValidator.equals("image URL matches", image.image_url, imageUrl);
  TestValidator.equals("display order is 0", image.display_order, 0);
  TestValidator.predicate(
    "created_at is populated",
    image.created_at.length > 0,
  );
  TestValidator.predicate("image id is valid UUID", image.id.length === 36);
  // Step 5: Verify the product relation in the image response
  TestValidator.equals("product id matches", image.product.id, product.id);
  TestValidator.equals(
    "product name matches",
    image.product.name,
    product.name,
  );
  TestValidator.equals(
    "product base price matches",
    image.product.base_price,
    product.base_price,
  );
}
