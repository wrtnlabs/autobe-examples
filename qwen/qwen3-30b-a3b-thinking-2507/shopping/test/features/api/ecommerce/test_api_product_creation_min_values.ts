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

export async function test_api_product_creation_min_values(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const category = await generate_random_ecommerce_categories_create(
    adminConnection,
    {
      body: {},
    },
  );
  const product = await generate_random_ecommerce_products_create(
    adminConnection,
    {
      body: {
        name: "fivec",
        description: "tenchara",
        basePrice: 0.01,
        categoriesId: category.id,
      },
    },
  );
  TestValidator.equals(
    "name should be exactly 5 characters",
    product.name,
    "fivec",
  );
  TestValidator.equals(
    "description should be exactly 10 characters",
    product.description,
    "tenchara",
  );
  TestValidator.equals(
    "base price should be minimum value",
    product.base_price,
    0.01,
  );
}
