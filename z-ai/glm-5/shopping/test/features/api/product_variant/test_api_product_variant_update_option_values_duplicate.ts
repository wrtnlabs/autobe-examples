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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_update_option_values_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller-specific connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Step 2: Create parent product for variants
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Step 3: Create first variant with option_values {"color": "Red", "size": "Large"}
  const firstVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "SKU-RED-LARGE-001",
          option_values: { color: "Red", size: "Large" },
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(firstVariant);
  // Step 4: Create second variant with option_values {"color": "Blue", "size": "Medium"}
  const secondVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "SKU-BLUE-MEDIUM-002",
          option_values: { color: "Blue", size: "Medium" },
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(secondVariant);
  // Step 5: Attempt to update second variant with duplicate option_values
  // This should be rejected because the combination {"color": "Red", "size": "Large"} already exists
  await TestValidator.error("duplicate option values", async () => {
    await api.functional.shoppingMall.seller.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: secondVariant.id,
        body: {
          optionValues: { color: "Red", size: "Large" },
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  });
}
