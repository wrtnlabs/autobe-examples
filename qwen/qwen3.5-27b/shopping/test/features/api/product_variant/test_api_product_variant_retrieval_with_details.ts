import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller can retrieve complete details of a product variant they own.
 *
 * Validates the complete product variant retrieval flow including seller authentication, product creation, variant creation, and variant detail retrieval. Ensures that the variant correctly contains all expected fields including SKU code, price override, option values, and inventory count.
 *
 * Special attention is given to verifying that the variant's data matches what was provided during creation, and that the variant is in an active state (not soft-deleted).
 *
 * 1. Seller registers and authenticates with email and password.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller creates a variant with SKU code, price override, option values, and initial stock.
 * 4. Seller retrieves the variant details using product ID and variant ID.
 * 5. Validates variant details match input data and variant is active.
 */
export async function test_api_product_variant_retrieval_with_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant with specific data
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variant);
  // 4. Retrieve variant details
  const retrievedVariant =
    await api.functional.shoppingMall.seller.products.variants.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(retrievedVariant);
  // 5. Validate variant details match creation data
  TestValidator.equals("variant id matches", retrievedVariant.id, variant.id);
  TestValidator.equals(
    "sku code matches",
    retrievedVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals("price matches", retrievedVariant.price, variant.price);
  TestValidator.equals(
    "inventory count matches",
    retrievedVariant.inventory_count,
    variant.inventory_count,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedVariant.created_at !== null &&
      retrievedVariant.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedVariant.updated_at !== null &&
      retrievedVariant.updated_at !== undefined,
  );
  TestValidator.equals("variant is active", retrievedVariant.deleted_at, null);
  // Validate options array content
  TestValidator.equals(
    "options count matches",
    retrievedVariant.options.length,
    variant.options.length,
  );
  for (let i = 0; i < variant.options.length; i++) {
    TestValidator.equals(
      `option ${i} key matches`,
      retrievedVariant.options[i].key,
      variant.options[i].key,
    );
    TestValidator.equals(
      `option ${i} value matches`,
      retrievedVariant.options[i].value,
      variant.options[i].value,
    );
  }
}
