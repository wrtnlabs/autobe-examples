import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_product_update_min_length_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a product
  const adminConnection: api.IConnection = { host: connection.host };
  const product =
    await generate_random_ecommerce_products_create(adminConnection, {});
  // 2. Update product name to exactly 5 characters (minimum valid length)
  const updatedProduct = await api.functional.ecommerce.products.update(
    adminConnection,
    {
      productId: product.id,
      body: {
        name: RandomGenerator.alphabets(5),
      } satisfies IEcommerceProduct.IUpdate,
    },
  );
  typia.assert(updatedProduct);
  // 3. Verify the name was updated to exactly 5 characters
  TestValidator.equals("name length is 5", updatedProduct.name.length, 5);
  TestValidator.equals(
    "name matches",
    updatedProduct.name,
    updatedProduct.name,
  );
  // 4. Verify all current attributes are returned
  TestValidator.equals("product ID matches", updatedProduct.id, product.id);
  TestValidator.predicate(
    "price not changed",
    updatedProduct.base_price === product.base_price,
  );
  TestValidator.equals(
    "category matches",
    updatedProduct.category,
    product.category,
  );
}