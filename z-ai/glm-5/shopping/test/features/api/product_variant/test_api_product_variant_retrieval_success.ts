import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
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
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test successful retrieval of an existing product variant with calculated stock quantity.
 */
export async function test_api_product_variant_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Add inventory records
  // Add restock: +100 units
  await generate_random_shopping_mall_seller_variants_inventory_adjust(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity_change: 100,
        reason: "Initial stock",
      },
    },
  );
  // Add order deduction: -20 units
  await generate_random_shopping_mall_seller_variants_inventory_adjust(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity_change: -20,
        reason: "Order #12345",
      },
    },
  );
  // 5. Retrieve the variant
  const retrieved = await api.functional.shoppingMall.products.variants.at(
    connection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  typia.assert(retrieved);
  // 6. Validate variant data
  TestValidator.equals("variant id matches", retrieved.id, variant.id);
  TestValidator.equals(
    "sku code matches",
    retrieved.sku_code,
    variant.sku_code,
  );
  TestValidator.equals("product id matches", retrieved.product.id, product.id);
  // 7. Validate stock quantity calculation: 100 - 20 = 80
  TestValidator.equals(
    "stock quantity is calculated correctly",
    retrieved.stock_quantity,
    80,
  );
  // 8. Verify variant is active
  TestValidator.equals(
    "variant is active (not deleted)",
    retrieved.deleted_at,
    null,
  );
}
