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

/**
 * Test product variant SKU uniqueness enforcement during update.
 *
 * This test verifies that SKU codes must be unique across the entire platform.
 * When a seller attempts to update a variant's SKU to match an existing SKU
 * from another variant (even from a different product), the system should
 * reject the request with a 409 Conflict error.
 */
export async function test_api_product_variant_update_sku_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create first product and extract category ID for subsequent products
  const product1 =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product1);
  // 3. Create first variant with unique SKU 'PROD1-SKU-001'
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          sku_code: "PROD1-SKU-001",
          option_values: { color: "Red", size: "L" },
        },
      },
    );
  typia.assert(variant1);
  // 4. Create second product using same category
  const product2 =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: product1.category.id,
          basePrice: typia.random<
            number & tags.Minimum<1> & tags.Maximum<10000>
          >(),
        },
      },
    );
  typia.assert(product2);
  // 5. Create second variant with unique SKU 'PROD2-SKU-001'
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          sku_code: "PROD2-SKU-001",
          option_values: { color: "Blue", size: "M" },
        },
      },
    );
  typia.assert(variant2);
  // 6. Attempt to update second variant's sku_code to match first variant's
  // This should fail with HTTP 409 Conflict
  await TestValidator.httpError(
    "SKU conflict when updating to duplicate SKU",
    409,
    async () => {
      await api.functional.shoppingMall.seller.seller.products.variants.update(
        sellerConnection,
        {
          productId: product2.id,
          variantId: variant2.id,
          body: {
            skuCode: "PROD1-SKU-001",
          } satisfies IShoppingMallProductVariant.IUpdate,
        },
      );
    },
  );
  // 7. Verify second variant retains its original sku_code
  TestValidator.equals(
    "second variant retains original sku_code",
    variant2.sku_code,
    "PROD2-SKU-001",
  );
}
