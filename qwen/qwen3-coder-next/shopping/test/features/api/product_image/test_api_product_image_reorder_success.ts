import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
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

export async function test_api_product_image_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.shoppingMall.auth.seller.join(
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
  typia.assert(seller);
  // 2. Create seller-specific connection with token
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${seller.token.access}`,
    },
  };
  // 3. Create product with multiple images
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerAuthConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        variants: ArrayUtil.repeat(2, () => ({
          name: RandomGenerator.name(),
          sku: RandomGenerator.alphaNumeric(10),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0>
          >(),
        })),
        images: ArrayUtil.repeat(3, () => ({
          image_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: 0,
        })),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Prepare reorder request with random image IDs
  const imageIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const reorderBody = {
    order: imageIds.map((imageId, index) => ({
      image_id: imageId,
      display_order: index + 1,
    })),
  } satisfies IShoppingMallProductImage.IOrder;
  // 5. Reorder images
  const reorderedImages =
    await api.functional.shoppingMall.products.images.reorder(connection, {
      productId: (product as IEntity).id,
      body: reorderBody,
    });
  typia.assert(reorderedImages);
  // 6. Verify reorder results
  TestValidator.equals("image count matches", reorderedImages.data.length, 3);
  TestValidator.predicate(
    "has valid pagination",
    reorderedImages.pagination.records >= 0,
  );
}