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
 * Test the primary success path for creating a product variant with stock.
 *
 * Validates the complete product variant creation flow including seller authentication, product setup, and variant creation with initial inventory. Ensures that the variant correctly stores SKU code, option values, and initial stock quantity, and that the inventory count is properly initialized.
 *
 * Special attention is given to verifying that the variant options are correctly stored as key-value pairs, the inventory count matches the initial stock quantity provided, and the variant is marked as active (deleted_at is null).
 *
 * 1. Seller registers and authenticates with email and password.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller creates a variant for the product with SKU code, variant options, and initial stock quantity.
 * 4. Validates variant details match input and inventory is properly initialized.
 */
export async function test_api_product_variant_creation_with_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Prepare variant input
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const initialStock = 100;
  const variantOptions: IShoppingMallProductVariantOption[] = [
    { key: "color", value: "Red" },
    { key: "size", value: "Large" },
  ];
  // 4. Create variant with stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: skuCode,
          price: null,
          variantOptions,
          initialStockQuantity: initialStock,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Validate variant details
  TestValidator.equals("SKU code matches input", variant.sku_code, skuCode);
  TestValidator.equals("price is null (using base price)", variant.price, null);
  TestValidator.equals(
    "has correct number of options",
    variant.options.length,
    2,
  );
  // Validate options exist (order not guaranteed)
  const colorOption = variant.options.find((opt) => opt.key === "color");
  const sizeOption = variant.options.find((opt) => opt.key === "size");
  TestValidator.predicate("color option exists", colorOption !== undefined);
  TestValidator.predicate("size option exists", sizeOption !== undefined);
  TestValidator.equals("color option value", colorOption!.value, "Red");
  TestValidator.equals("size option value", sizeOption!.value, "Large");
  TestValidator.equals(
    "inventory count matches initial stock",
    variant.inventory_count,
    initialStock,
  );
  TestValidator.predicate("has valid created_at", variant.created_at !== null);
  TestValidator.predicate("has valid updated_at", variant.updated_at !== null);
  TestValidator.equals(
    "variant is active (not deleted)",
    variant.deleted_at,
    null,
  );
}
