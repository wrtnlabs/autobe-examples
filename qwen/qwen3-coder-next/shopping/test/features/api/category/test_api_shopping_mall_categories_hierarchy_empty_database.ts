import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_shopping_mall_categories_hierarchy_empty_database(
  connection: api.IConnection,
): Promise<void> {
  // Test category hierarchy retrieval with empty database state (no categories)
  // Verify the endpoint returns a properly structured response with zero root categories
  const output =
    await api.functional.shoppingMall.categories.hierarchy(connection);
  typia.assert(output);
  // Validate response structure - IInvert should have proper properties
  TestValidator.predicate("response has id", typeof output.id === "string");
  TestValidator.predicate("response has name", typeof output.name === "string");
  TestValidator.predicate(
    "response has description",
    typeof output.description === "string" || output.description === null,
  );
  TestValidator.predicate(
    "response has parent_category_id",
    output.parent_category_id === null ||
      typeof output.parent_category_id === "string",
  );
  TestValidator.predicate(
    "response has created_at",
    typeof output.created_at === "string",
  );
  TestValidator.predicate(
    "response has updated_at",
    typeof output.updated_at === "string",
  );
  TestValidator.predicate(
    "response has deleted_at",
    output.deleted_at === null || typeof output.deleted_at === "string",
  );
  // Validate children array - should be empty for empty database
  TestValidator.predicate("children is array", Array.isArray(output.children));
  TestValidator.equals(
    "zero categories in empty database",
    output.children.length,
    0,
  );
}
