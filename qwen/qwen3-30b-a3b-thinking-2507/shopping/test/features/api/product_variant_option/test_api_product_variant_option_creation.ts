import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { generate_random_ecommerce_products_variants_create } from "../../../generate/generate_random_ecommerce_products_variants_create";
import { generate_random_ecommerce_products_variants_options_create } from "../../../generate/generate_random_ecommerce_products_variants_options_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_product_variant_option } from "../../../prepare/prepare_random_ecommerce_product_variant_option";

export async function test_api_product_variant_option_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a category for product categorization
  const category = await generate_random_ecommerce_categories_create(
    connection,
    {
      body: {},
    },
  );
  // 2. Create a product using the created category
  const product = await generate_random_ecommerce_products_create(connection, {
    body: {
      name: "Tech Product",
      description: "A high-tech product for testing",
      basePrice: 49.99,
      categoriesId: category.id,
    },
  });
  // 3. Create a product variant for the product
  const variant = await generate_random_ecommerce_products_variants_create(
    connection,
    {
      body: {
        sku: "VAR-001",
        price: 59.99,
        stock_quantity: 5,
      },
      params: {
        productId: product.id,
      },
    },
  );
  // 4. Add a valid option-value pair (color: blue) to the product variant
  const option =
    await generate_random_ecommerce_products_variants_options_create(
      connection,
      {
        body: {
          option_key: "color",
          option_value: "blue",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  // 5. Validate option creation
  TestValidator.equals("option key matches", option.key, "color");
  TestValidator.equals("option value matches", option.value, "blue");
}
