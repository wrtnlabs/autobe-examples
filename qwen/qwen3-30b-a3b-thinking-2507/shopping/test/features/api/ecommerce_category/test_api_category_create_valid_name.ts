import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

export async function test_api_category_create_valid_name(
  connection: api.IConnection,
) {
  const testConnection: api.IConnection = { host: connection.host };
  const category = await generate_random_ecommerce_categories_create(
    testConnection,
    {
      body: {
        name: "Electronics",
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceCategory.ICreate,
    },
  );
  typia.assert(category);
  TestValidator.equals(
    "Category name matches input",
    category.name,
    "Electronics",
  );
  TestValidator.equals(
    "Category description matches input",
    category.description,
    RandomGenerator.paragraph({ sentences: 2 }),
  );
}
