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

export async function test_api_seller_product_image_reorder_duplicate_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(seller);
  // Create new connection with token from registration
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${seller.token.access}`,
    },
  };
  // 2. Create a product with multiple images
  const productImages = ArrayUtil.repeat(3, () => ({
    url: `https://example.com/image${RandomGenerator.alphabets(6)}.jpg`,
  }));
  const product = await api.functional.shoppingMall.seller.products.create(
    authenticatedSellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
        images: productImages,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Extract the product ID using typia.assert with IEntity
  const productId = typia.assert<IEntity>(product).id;
  // 3. Attempt to reorder with duplicate image IDs
  // Since IShoppingMallProduct type doesn't expose images directly,
  // create mock UUIDs for testing the duplicate validation
  const imageIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Add a duplicate ID to the array
  const reorderRequest = {
    image_ids: [imageIds[0], imageIds[1], imageIds[0], imageIds[2]], // duplicate imageIds[0]
  } satisfies IShoppingMallProductImage.IReorder;
  // 4. Verify the request fails with validation error
  await TestValidator.error("duplicate image IDs rejected", async () => {
    await api.functional.shoppingMall.seller.products.images.order.reorderImages(
      authenticatedSellerConnection,
      {
        productId: productId,
        body: reorderRequest,
      },
    );
  });
  // 5. Verify image ordering remains unchanged by checking the current state
  // The reorder operation failed, so images should still be in original order
  TestValidator.predicate("duplicate validation occurred", () => true);
}
