import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_product_details_with_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a category
  const category = await generate_random_ecommerce_categories_create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      },
    },
  );
  // 2. Create a product with category association
  const product = await generate_random_ecommerce_products_create(connection, {
    body: {
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 10,
      }),
      categoriesId: category.id,
      basePrice: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0.01>
      >(),
    },
  });
  // 3. Get product details
  const retrievedProduct = await api.functional.ecommerce.products.at(
    connection,
    {
      productId: product.id,
    },
  );
  typia.assert(retrievedProduct);
  // 4. Validate product details
  TestValidator.equals(
    "Product name matches input",
    retrievedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "Product description matches input",
    retrievedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "Product category matches input",
    retrievedProduct.category,
    category.id,
  );
  TestValidator.predicate(
    "Base price is positive",
    retrievedProduct.base_price > 0,
  );
}