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
 * Test product variant retrieval "not found" scenarios.
 *
 * Validates that GET /shoppingMall/products/{productId}/variants/{variantId}
 * properly returns 404 Not Found in various invalid scenarios:
 * - Non-existent variant ID (random UUID)
 * - Variant belongs to different product
 * - Non-existent product ID
 */
export async function test_api_product_variant_not_found_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // SETUP: Create sellers, products, and variants for testing
  // ============================================================
  // Create first seller and product with variant
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {});
  const product1 =
    await generate_random_shopping_mall_seller_seller_products_create(
      seller1Connection,
      {},
    );
  typia.assert(product1);
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product1.id },
      },
    );
  typia.assert(variant1);
  // Create second seller and product with variant
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {});
  const product2 =
    await generate_random_shopping_mall_seller_seller_products_create(
      seller2Connection,
      {},
    );
  typia.assert(product2);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller2Connection,
      {
        params: { productId: product2.id },
      },
    );
  typia.assert(variant2);
  // ============================================================
  // SCENARIO 1: Non-existent variant ID
  // ============================================================
  // Send GET request with valid productId but non-existent variantId
  // Expected: 404 Not Found
  const nonExistentVariantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Non-existent variant ID should return 404",
    404,
    async () =>
      await api.functional.shoppingMall.products.variants.at(connection, {
        productId: product1.id,
        variantId: nonExistentVariantId,
      }),
  );
  // ============================================================
  // SCENARIO 2: Variant belongs to different product
  // ============================================================
  // Send GET request with productId from product1 and variantId from product2
  // Expected: 404 Not Found (variant exists but belongs to different product)
  await TestValidator.httpError(
    "Variant belongs to different product should return 404",
    404,
    async () =>
      await api.functional.shoppingMall.products.variants.at(connection, {
        productId: product1.id,
        variantId: variant2.id,
      }),
  );
  // ============================================================
  // SCENARIO 3: Non-existent product ID
  // ============================================================
  // Send GET request with non-existent productId
  // Expected: 404 Not Found
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Non-existent product ID should return 404",
    404,
    async () =>
      await api.functional.shoppingMall.products.variants.at(connection, {
        productId: nonExistentProductId,
        variantId: variant1.id,
      }),
  );
}
