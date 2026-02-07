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

export async function test_api_product_update_min_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a product to update
  const productConnection: api.IConnection = { host: connection.host };
  const product = await generate_random_ecommerce_products_create(
    productConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        categoriesId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 2. Update the product's base price to minimum $0.01
  const updatedProduct = await api.functional.ecommerce.products.update(
    productConnection,
    {
      productId: product.id,
      body: {
        base_price: 0.01,
      },
    },
  );
  typia.assert(updatedProduct);
  // 3. Verify the updated product has the new price
  TestValidator.equals(
    "base price should be $0.01",
    updatedProduct.base_price,
    0.01,
  );
  // 4. Verify the product ID remains the same
  TestValidator.equals(
    "product ID should match",
    updatedProduct.id,
    product.id,
  );
}
