import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a top-level category by its unique identifier.
 *
 * Validates the complete category retrieval flow including response structure validation, top-level category verification (parent is null), and active status confirmation (deletedAt is null). Ensures that all timestamps are properly formatted in ISO 8601 and all required fields are present.
 *
 * This test represents the common case when customers browse the main category catalog and retrieve category details for navigation and product filtering purposes.
 *
 * 1. Generate a random UUID for the category identifier.
 * 2. Call the GET /shoppingMall/categories/{categoryId} endpoint.
 * 3. Validate response structure with typia.assert().
 * 4. Verify parent is null (top-level category).
 * 5. Verify deletedAt is null (active category).
 */
export async function test_api_category_retrieve_top_level(
  connection: api.IConnection,
): Promise<void> {
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const category = await api.functional.shoppingMall.categories.at(connection, {
    categoryId,
  });
  typia.assert(category);
  TestValidator.predicate(
    "parent is null (top-level)",
    category.parent === null,
  );
  TestValidator.predicate(
    "deletedAt is null (active)",
    category.deletedAt === null,
  );
}
