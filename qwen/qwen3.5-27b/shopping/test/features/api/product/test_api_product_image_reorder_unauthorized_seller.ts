import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
 * Test that only the product owner can reorder images, preventing unauthorized sellers from modifying another seller's product images.
 *
 * Validates that product ownership is enforced for image reordering operations. The test creates a product with images owned by Seller A, then attempts to reorder those images as Seller B. The system must reject the unauthorized reordering attempt with a 403 Forbidden error, ensuring sellers cannot manipulate other sellers' product presentations.
 *
 * 1. Register and authenticate as Seller A
 * 2. Create a product owned by Seller A
 * 3. Upload at least 2 images to the product
 * 4. Register and authenticate as Seller B (different seller account)
 * 5. As Seller B, attempt to reorder Seller A's product images
 * 6. Verify the request is rejected with 403 Forbidden
 */
export async function test_api_product_image_reorder_unauthorized_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {});
  // 2. Create a product owned by Seller A
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload at least 2 images to the product
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  // Store original display orders for verification
  const originalImage1Order = image1.display_order;
  const originalImage2Order = image2.display_order;
  // 4. Register and authenticate as Seller B (different seller account)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // 5. As Seller B, attempt to reorder Seller A's product images
  // Try to change the display order of one image
  const reorderBody = {
    display_order: originalImage2Order,
  } satisfies IShoppingMallProductImage.IUpdate;
  // 6. Verify the request is rejected with 403 Forbidden
  await TestValidator.httpError(
    "unauthorized seller cannot reorder images",
    403,
    async () =>
      await api.functional.shoppingMall.seller.products.images.putByProductid(
        sellerBConnection,
        {
          productId: product.id,
          body: reorderBody,
        },
      ),
  );
}
