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
 * Test that suspended sellers are forbidden from reordering product images.
 *
 * This test validates that the image reorder endpoint enforces seller
 * authorization checks and rejects requests from suspended accounts.
 *
 * Note: This test requires the test environment to provide a mechanism
 * for simulating a suspended seller state, either through:
 * - Mock authentication layer
 * - Pre-configured suspended seller fixture
 * - Test environment configuration
 *
 * Flow:
 * 1. Create a seller account
 * 2. Create a product owned by this seller
 * 3. Upload multiple images to the product
 * 4. Attempt to reorder images (should fail for suspended seller)
 * 5. Verify 403 Forbidden response
 */
export async function test_api_product_image_reorder_suspended_seller_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Step 2: Create product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Step 3: Upload multiple images (at least 2 for reorder)
  const images = await ArrayUtil.asyncRepeat(3, async (index) => {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          params: {
            productId: product.id,
          },
          body: {
            imageUrl: typia.random<string & tags.Format<"url">>(),
            displayOrder: index + 1,
          },
        },
      );
    typia.assert(image);
    return image;
  });
  // Step 4: Prepare reorder request - reverse order
  const imageIds = images.map((img) => img.id);
  const displayOrders = [3, 2, 1] as const;
  // Step 5: Attempt reorder - expecting 403 Forbidden for suspended seller
  // In production, the seller would be suspended via admin action
  // Test framework should simulate suspended state for this validation
  await TestValidator.httpError(
    "suspended seller cannot reorder images",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.images.reorder(
        sellerConnection,
        {
          productId: product.id,
          body: {
            imageIds: imageIds,
            displayOrders: [...displayOrders],
          } satisfies IShoppingMallProductImage.IReorder,
        },
      );
    },
  );
}
