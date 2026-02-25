import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_images_create_image } from "../../../generate/generate_random_shopping_mall_seller_products_images_create_image";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_seller_product_image_create_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test failure scenario where an unauthorized user (not logged in as seller) attempts to create a new product image
  // This test ensures the API enforces authorization properly and does not allow image creation without valid seller authentication.
  // 1. Synthesize a random product ID (UUID) - product is not created actually
  const fakeProductId = typia.random<string & tags.Format<"uuid">>();
  // 2. Prepare product image creation data
  const imageBody = {
    image_url: `https://example.com/image_${Math.random().toString(36).substring(2, 10)}.jpg`,
    display_order: 0,
  } satisfies IShoppingMallProductImage.ICreate;
  // 3. Attempt to create product image using base connection (unauthorized) - should fail
  await TestValidator.httpError(
    "unauthorized access to create product image",
    401,
    async () => {
      await api.functional.shoppingMall.seller.products.images.createImage(
        connection,
        {
          productId: fakeProductId,
          body: imageBody,
        },
      );
    },
  );
}
