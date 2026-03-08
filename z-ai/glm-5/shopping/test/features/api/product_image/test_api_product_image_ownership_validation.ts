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
 * Test that a seller cannot upload images to products owned by another seller.
 * This validates ownership boundaries and data isolation between sellers.
 *
 * Scenario:
 * 1. Seller A registers and creates a product
 * 2. Seller B registers
 * 3. Seller B attempts to upload an image to Seller A's product
 * 4. Expect 403 Forbidden response (or 404 if product doesn't exist due to category)
 */
export async function test_api_product_image_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Seller A and create a product
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerA);
  // Create a product for Seller A
  // Note: Using generate utility which handles category requirements
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        basePrice: typia.random<
          number & tags.Type<"uint32">
        >() satisfies number as number,
      },
    },
  );
  typia.assert(product);
  // Step 2: Register Seller B with different email
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerB);
  // Step 3: Seller B attempts to upload an image to Seller A's product
  // This should be rejected with 403 Forbidden
  await TestValidator.httpError(
    "seller B cannot upload image to seller A's product",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.images.create(
        sellerBConnection,
        {
          productId: product.id,
          body: {
            image_url: typia.random<string & tags.Format<"url">>() satisfies string as string,
            display_order: 0,
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    },
  );
}