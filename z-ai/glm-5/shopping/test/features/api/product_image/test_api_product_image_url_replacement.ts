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

export async function test_api_product_image_url_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Create an initial product image with specific display_order
  const initialUrl = "https://example.com/initial-image.jpg";
  const initialDisplayOrder = 1;
  const initialImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: initialUrl,
          displayOrder: initialDisplayOrder,
        },
      },
    );
  typia.assert(initialImage);
  // Verify initial image properties
  TestValidator.equals("initial image url", initialImage.imageUrl, initialUrl);
  TestValidator.equals(
    "initial display_order",
    initialImage.displayOrder,
    initialDisplayOrder,
  );
  // 4. Update only the image URL
  const newUrl = "https://example.com/updated-image.jpg";
  const updateBody = {
    image_url: newUrl,
  } satisfies IShoppingMallProductImage.IUpdate;
  const updatedImage =
    await api.functional.shoppingMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: initialImage.id,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);
  // 5. Validate the update
  TestValidator.equals("image id unchanged", updatedImage.id, initialImage.id);
  TestValidator.equals("image url updated", updatedImage.imageUrl, newUrl);
  TestValidator.equals(
    "display_order preserved",
    updatedImage.displayOrder,
    initialDisplayOrder,
  );
  TestValidator.equals(
    "product association maintained",
    updatedImage.product.id,
    product.id,
  );
}
