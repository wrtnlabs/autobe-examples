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

export async function test_api_category_retrieve_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a test category using the utility function
  const testConnection: api.IConnection = { host: connection.host };
  const testCategory = await generate_random_ecommerce_categories_create(
    testConnection,
    {},
  );
  // 2. Retrieve the created category
  const retrievedCategory = await api.functional.ecommerce.categories.at(
    testConnection,
    {
      categoryId: testCategory.id,
    },
  );
  typia.assert(retrievedCategory);
  // 3. Validate response fields
  TestValidator.equals(
    "Category name should match",
    retrievedCategory.name,
    testCategory.name,
  );
  TestValidator.equals(
    "Category description should match",
    retrievedCategory.description,
    testCategory.description,
  );
  // Check timestamps are non-empty strings
  TestValidator.predicate(
    "Category timestamps should be valid",
    retrievedCategory.created_at && retrievedCategory.updated_at !== "",
  );
  TestValidator.equals(
    "Category deleted_at should be null",
    retrievedCategory.deleted_at,
    null,
  );
  // 4. Validate hierarchical relationships - ISummary is empty
  // Since parent is IEcommerceCategory.ISummary | null (an empty object or null),
  // we check if it matches testCategory.parent
  TestValidator.equals(
    "Parent category should match",
    retrievedCategory.parent,
    testCategory.parent,
  );
  // 5. Validate children categories
  TestValidator.equals(
    "Number of children categories should match",
    retrievedCategory.children.length,
    testCategory.children.length,
  );
}
