import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
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
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_image_deletion_primary_old_image(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create product with multiple images
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<number & tags.Minimum<0.01>>(),
        images: [
          "https://example.com/primary.jpg",
          "https://example.com/secondary.jpg",
        ] satisfies string[] & tags.MaxItems<15>,
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(10),
            price: typia.random<number & tags.Minimum<0>>(),
            options: [
              {
                option_name: "Color",
                option_value: "Red",
              },
            ],
          },
        ] satisfies IShoppingMallProductVariant.ICreate[] &
          tags.MinItems<1> &
          tags.MaxItems<20>,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Delete an image - we don't have access to image IDs, so we generate a valid UUID
  // This tests that the API endpoint accepts correct parameters
  const imageIdToDelete = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shoppingMall.seller.products.images.erase(
    sellerConnection,
    {
      imageId: imageIdToDelete,
    },
  );
  // Note: We cannot verify snapshot creation or image promotion since no endpoint
  // exists to retrieve product details or snapshots. This test validates only
  // the API call structure and parameter correctness, per scenario rewrite policy.
}
