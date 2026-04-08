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
 * Test creating a product variant with a price override that differs from the product base price.
 *
 * Validates the complete product variant creation flow including seller authentication, product setup, and variant creation with a custom price override. Ensures that the variant correctly maintains its own price independent of the product's base price, and that all variant properties are properly initialized.
 *
 * Special attention is given to verifying that the price override is correctly stored and that the variant's inventory is properly initialized with the specified stock quantity.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Seller creates a product with a base price (e.g., 10000).
 * 3. Seller creates a variant with a price override (e.g., 15000) different from the base price.
 * 4. Validates variant details match input including the price override, SKU code, options, and inventory count.
 */
export async function test_api_product_variant_creation_with_price_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 2. Create a product with base price
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          base_price: 10000,
        },
      },
    );
  typia.assert(product);
  // 3. Create a variant with price override
  const variant: IShoppingMallProductVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: "PROD-001-PREM-GOLD-XL",
          price: 15000,
          variantOptions: [
            { key: "color", value: "Premium Gold" },
            { key: "size", value: "XL" },
          ],
          initialStockQuantity: 50,
        },
      },
    );
  typia.assert(variant);
  // 4. Validate variant properties
  TestValidator.equals(
    "SKU code matches input",
    variant.sku_code,
    "PROD-001-PREM-GOLD-XL",
  );
  TestValidator.equals("price override is set correctly", variant.price, 15000);
  TestValidator.notEquals(
    "price differs from base price",
    variant.price,
    product.base_price,
  );
  TestValidator.predicate(
    "price override is different from base",
    variant.price !== product.base_price,
  );
  TestValidator.equals(
    "inventory count matches initial stock",
    variant.inventory_count,
    50,
  );
  TestValidator.predicate("has options array", variant.options.length > 0);
  TestValidator.equals("has 2 options", variant.options.length, 2);
  TestValidator.equals(
    "first option is color",
    variant.options[0].key,
    "color",
  );
  TestValidator.equals(
    "first option value is Premium Gold",
    variant.options[0].value,
    "Premium Gold",
  );
  TestValidator.equals("second option is size", variant.options[1].key, "size");
  TestValidator.equals(
    "second option value is XL",
    variant.options[1].value,
    "XL",
  );
  TestValidator.predicate(
    "created_at is set",
    variant.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    variant.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null (active)", variant.deleted_at, null);
}
