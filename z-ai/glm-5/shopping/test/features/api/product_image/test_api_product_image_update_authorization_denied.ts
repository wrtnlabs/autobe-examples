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

/**
 * Test authorization enforcement preventing a seller from updating another seller's product image.
 *
 * **Setup Steps:**
 * 1. Register and authenticate as seller A
 * 2. Seller A creates a product
 * 3. Seller A uploads an image to their product
 * 4. Register and authenticate as seller B (different seller)
 *
 * **Test Execution:**
 * 1. While authenticated as seller B, attempt to call PUT /shoppingMall/seller/products/{productId}/images/{imageId} using seller A's productId and imageId
 * 2. Verify the response returns HTTP 403 Forbidden
 *
 * **Business Rule Validation:**
 * - Verify that only the seller who owns the product can update its images
 * - Verify the system properly validates seller_id matches authenticated seller
 * - Verify cross-seller isolation is enforced
 *
 * **Expected Result:** The operation is denied with HTTP 403 Forbidden because seller B does not own the product belonging to seller A.
 */
export async function test_api_product_image_update_authorization_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  // Step 2: Seller A creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // Step 3: Seller A uploads an image to their product
  const image =
    await generate_random_shopping_mall_seller_sellers_me_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          order: 1,
        },
      },
    );
  typia.assert(image);
  // Step 4: Register and authenticate seller B (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  // Step 5: Seller B attempts to update seller A's product image
  // Expected: HTTP 403 Forbidden (seller B does not own the product)
  await TestValidator.httpError(
    "seller B cannot update seller A's product image",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.images.update(
        sellerBConnection,
        {
          productId: product.id,
          imageId: image.id,
          body: { order: 2 } satisfies IShoppingMallProductImage.IUpdate,
        },
      );
    },
  );
}
