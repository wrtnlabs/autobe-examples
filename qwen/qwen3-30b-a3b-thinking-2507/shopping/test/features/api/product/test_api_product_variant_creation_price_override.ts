import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { generate_random_ecommerce_products_variants_create } from "../../../generate/generate_random_ecommerce_products_variants_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_product_variant_creation_price_override(
  connection: api.IConnection,
) {
  // Create category for product
  const category = await generate_random_ecommerce_categories_create(
    connection,
    {},
  );
  // Create product with base price
  const product = await generate_random_ecommerce_products_create(connection, {
    body: {
      name: RandomGenerator.paragraph({ sentences: 1 }),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      basePrice: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
      categoriesId: category.id,
    },
  });
  // 1. Create variant with specific price override ($29.99) and SKU V-789012-001
  const priceOverrideVariant =
    await generate_random_ecommerce_products_variants_create(connection, {
      body: {
        sku: "V-789012-001",
        price: 29.99,
        stock_quantity: 15,
      },
      params: {
        productId: product.id,
      },
    });
  typia.assert(priceOverrideVariant);
  // 2. Create variant with price omitted to test fallback (uses base product price)
  const priceFallbackVariant =
    await generate_random_ecommerce_products_variants_create(connection, {
      body: {
        sku: "V-789012-002",
        price: null,
        stock_quantity: 10,
      },
      params: {
        productId: product.id,
      },
    });
  typia.assert(priceFallbackVariant);
  // 3. Validate price override variant has exactly $29.99
  TestValidator.equals(
    "price override matches",
    priceOverrideVariant.price,
    29.99,
  );
  // 4. Validate price fallback variant uses base product price
  TestValidator.equals(
    "price fallback matches base price",
    priceFallbackVariant.price,
    product.base_price,
  );
  // 5. Validate stock quantity for both variants
  TestValidator.equals(
    "override stock quantity matches",
    priceOverrideVariant.stock_quantity,
    15,
  );
  TestValidator.equals(
    "fallback stock quantity matches",
    priceFallbackVariant.stock_quantity,
    10,
  );
}
