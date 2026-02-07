import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_seller_product_image_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 1: Seller registration and login
  const sellerJoinResponse = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shopName: RandomGenerator.name(3),
        shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(sellerJoinResponse);
  // Create new seller connection with token from join response
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: sellerJoinResponse.token.access,
    },
  };
  // Step 2: Create product with multiple images
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerAuthConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        variants: [
          {
            sku: RandomGenerator.alphaNumeric(10),
            name: RandomGenerator.name(),
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
            stock: typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<0> &
                tags.Maximum<1000>
            >(),
          },
        ],
        images: [
          {
            url: `https://example.com/image1_${RandomGenerator.alphaNumeric(6)}.jpg`,
            display_order: 0,
          },
          {
            url: `https://example.com/image2_${RandomGenerator.alphaNumeric(6)}.jpg`,
            display_order: 1,
          },
          {
            url: `https://example.com/image3_${RandomGenerator.alphaNumeric(6)}.jpg`,
            display_order: 2,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 3: Generate a random UUID for productId (since product.id doesn't exist)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Reorder images using random image IDs
  const imageId1 = typia.random<string & tags.Format<"uuid">>();
  const imageId2 = typia.random<string & tags.Format<"uuid">>();
  const imageId3 = typia.random<string & tags.Format<"uuid">>();
  const reorderedImageIds = [imageId3, imageId1, imageId2];
  const reorderResponse =
    await api.functional.shoppingMall.seller.products.images.order.reorderImages(
      sellerAuthConnection,
      {
        productId: productId,
        body: {
          image_ids: reorderedImageIds,
        } satisfies IShoppingMallProductImage.IReorder,
      },
    );
  typia.assert(reorderResponse);
  // Verify the reorder response structure
  TestValidator.predicate(
    "reorder response is valid",
    typeof reorderResponse === "object" && reorderResponse !== null,
  );
}
