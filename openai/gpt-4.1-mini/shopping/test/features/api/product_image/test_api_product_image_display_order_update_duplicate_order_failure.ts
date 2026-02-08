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
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_display_order_update_duplicate_order_failure(
  connection: api.IConnection,
): Promise<void> {
  // Seller login connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate seller by joining (register)
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  // Use random UUID for productId (since product.id is not defined in DTO)
  const productId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  // Upload multiple product images
  const imagesCount = 3;
  // We construct images info with generated IDs since image.id is not defined
  const images = await Promise.all(
    Array.from({ length: imagesCount }).map(async (_, i) => {
      const image =
        await generate_random_shopping_mall_seller_products_images_create(
          sellerConnection,
          {
            params: { productId },
            body: {
              image_url: `https://example.com/image_${i + 1}.jpg`,
              display_order: i + 1,
            },
          },
        );
      typia.assert(image);
      // Return synthetic ID and display_order for later update
      return {
        id: typia.random<string & tags.Format<"uuid">>() satisfies string &
          tags.Format<"uuid">,
        display_order: i + 1,
      };
    }),
  );
  // Prepare update body with duplicate display_order intentionally
  const updateBody = images.map((img, idx) => ({
    id: img.id,
    display_order: idx === 1 ? 1 : img.display_order, // duplicate display_order for first two images
  }));
  // Call updateImages expecting error due to duplicate display_order violation
  await TestValidator.error(
    "product image display order update - duplicate order should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.images.updateImages(
        sellerConnection,
        {
          productId,
          body: updateBody,
        },
      );
    },
  );
}
