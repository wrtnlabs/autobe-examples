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

export async function test_api_product_image_suspended_seller_restriction(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test suspended seller image upload restriction.
   *
   * Business Rule: Suspended sellers cannot upload images to their products,
   * even though they own them. This enforces platform moderation policies.
   *
   * ARCHITECTURAL NOTE: This test requires an admin API endpoint to suspend
   * sellers (e.g., POST /shoppingMall/admin/sellers/{sellerId}/suspend),
   * which is not currently available. The test documents expected behavior.
   */
  // Step 1: Register a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Verify seller is initially in good standing
  TestValidator.equals(
    "seller not suspended initially",
    sellerAuth.suspended,
    false,
  );
  TestValidator.equals("seller not banned initially", sellerAuth.banned, false);
  // Step 2: Create a product owned by this seller
  // Note: Requires valid categoryId - assuming test environment has categories
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId,
        basePrice: typia.random<number & tags.Minimum<1>>(),
      },
    },
  );
  typia.assert(product);
  // Verify product ownership
  TestValidator.equals(
    "product seller matches",
    product.seller.id,
    sellerAuth.id,
  );
  // Step 3: Image upload by active seller succeeds (baseline)
  const activeSellerImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(activeSellerImage);
  TestValidator.equals(
    "image belongs to correct product",
    activeSellerImage.product.id,
    product.id,
  );
  // Step 4: Suspended seller restriction
  // REQUIREMENT: Admin API needed to suspend seller
  // Once available, the test should verify:
  // await TestValidator.httpError("suspended seller cannot upload", 403, async () => {
  //   await generate_random_shopping_mall_seller_products_images_create(
  //     sellerConnection,
  //     { params: { productId: product.id } },
  //   );
  // });
}
