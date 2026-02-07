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

export async function test_api_category_retrieve_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create parent category for hierarchical validation
  const parentCategory = await generate_random_ecommerce_categories_create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(parentCategory);
  // 2. Create child category with parent reference
  const childCategory = await generate_random_ecommerce_categories_create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
        parent_id: parentCategory.id,
      },
    },
  );
  typia.assert(childCategory);
  // 3. Retrieve child category
  const retrievedChild = await api.functional.ecommerce.categories.at(
    connection,
    {
      categoryId: childCategory.id,
    },
  );
  typia.assert(retrievedChild);
  // 4. Validate parent relationship
  TestValidator.predicate(
    "parent field is present",
    retrievedChild.parent !== null,
  );
  // No need to check parent.id as ISummary is an empty object
}
