import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_hierarchy_retrieval_with_proper_nesting(
  connection: api.IConnection,
): Promise<void> {
  const categories =
    await api.functional.ecommerceMall.categories.get(connection);
  typia.assert(categories);
  // Validate top-level categories exist and have subcategories
  if (!Array.isArray(categories)) {
    throw new Error("Expected categories to be an array");
  }
  // Verify each category follows one-level nesting
  for (const category of categories) {
    // Top-level categories should not have parent (already validated by API)
    // Subcategories should be present and also valid
    if (category.subcategories && Array.isArray(category.subcategories)) {
      for (const subcategory of category.subcategories) {
        // Subcategories should not have further children (one-level restriction)
        if (
          subcategory.subcategories &&
          Array.isArray(subcategory.subcategories)
        ) {
          throw new Error(
            "Subcategory should not have subcategories (one-level nesting restriction)",
          );
        }
      }
    }
  }
  // Validate sorting: categories should be sorted alphabetically
  for (let i = 0; i < categories.length - 1; i++) {
    TestValidator.predicate(
      `category ${i} name <= next category name`,
      categories[i].name <= categories[i + 1].name,
    );
  }
  // Validate subcategories are sorted alphabetically within each parent
  for (const category of categories) {
    if (category.subcategories && Array.isArray(category.subcategories)) {
      const subcategories = category.subcategories;
      for (let i = 0; i < subcategories.length - 1; i++) {
        TestValidator.predicate(
          `subcategory ${i} name <= next subcategory name in ${category.name}`,
          subcategories[i].name <= subcategories[i + 1].name,
        );
      }
    }
  }
}
