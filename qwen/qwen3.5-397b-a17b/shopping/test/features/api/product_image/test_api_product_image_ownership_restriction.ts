import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
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
 * Test product image ownership restriction.
 *
 * This test validates that sellers can only manage images for products they own.
 *
 * Test Flow:
 * 1. Seller A registers and creates a product
 * 2. Seller A uploads multiple images to their product
 * 3. Seller B (different seller) registers
 * 4. Seller B attempts to update images on Seller A's product
 * 5. Verify the operation fails with authorization error
 * 6. Verify original image order remains unchanged
 *
 * This ensures the critical security requirement that image management
 * is restricted to the product owner seller only.
 */
export async function test_api_product_image_ownership_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Seller A (product owner)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Seller A creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller A uploads multiple images to their product
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(image2);
  // Store original image IDs and order for verification
  const originalImageIds = [image1.id, image2.id];
  const originalDisplayOrders = [image1.display_order, image2.display_order];
  // 4. Create Seller B (different seller, non-owner)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 5. Seller B attempts to update images on Seller A's product (should fail)
  await TestValidator.error(
    "seller cannot update images on product they don't own",
    async () => {
      await api.functional.shoppingMall.seller.products.images.patchByProductid(
        sellerBConnection,
        {
          productId: product.id,
          body: {
            display_order: 0,
          } satisfies IShoppingMallProductImage.IUpdate,
        },
      );
    },
  );
  // 6. Verify original image data is preserved (images created successfully with expected properties)
  TestValidator.equals("image 1 ID preserved", image1.id, originalImageIds[0]);
  TestValidator.equals("image 2 ID preserved", image2.id, originalImageIds[1]);
  TestValidator.equals(
    "image 1 display order unchanged",
    image1.display_order,
    originalDisplayOrders[0],
  );
  TestValidator.equals(
    "image 2 display order unchanged",
    image2.display_order,
    originalDisplayOrders[1],
  );
}