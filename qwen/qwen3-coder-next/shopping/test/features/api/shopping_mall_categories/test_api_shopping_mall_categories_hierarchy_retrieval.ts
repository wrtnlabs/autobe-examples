import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of complete two-level category hierarchy as a public endpoint.
 * Verify that root categories (with null parent_category_id) are returned at the top level,
 * each containing their subcategories (with parent_category_id matching the root's id) in
 * the children array. Validate that all active categories are visible regardless of user
 * authentication status, and that the hierarchical structure correctly reflects the database
 * relationships. The response should include category names, descriptions, and proper nesting
 * without requiring any authentication headers.
 */
export async function test_api_shopping_mall_categories_hierarchy_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Call the hierarchy endpoint (no authentication required)
  const categories = typia.assert<IShoppingMallCategory.IInvert[]>(
    await api.functional.shoppingMall.categories.hierarchy(connection),
  );
  // Verify we got at least one category
  TestValidator.predicate("has at least one category", categories.length > 0);
  // Verify root categories (those with no parent)
  const rootCategories = categories.filter(
    (cat) => cat.parent_category_id === null,
  );
  TestValidator.predicate("has root categories", rootCategories.length > 0);
  // Verify each root category has children
  for (const root of rootCategories) {
    TestValidator.predicate("root has children", root.children.length > 0);
    // Verify all children belong to this root
    for (const child of root.children) {
      // ISummary has 'parent' property which points to the parent category
      TestValidator.predicate(
        "child has parent reference",
        child.parent !== null,
      );
      if (child.parent !== null) {
        TestValidator.equals(
          "child parent matches root",
          child.parent.id,
          root.id,
        );
      }
    }
  }
  // Verify subcategories have correct structure (no children arrays)
  for (const root of rootCategories) {
    for (const child of root.children) {
      // ISummary should have subcategory_count, not children array
      TestValidator.predicate(
        "subcategories have subcategory_count property",
        typeof child.subcategory_count === "number",
      );
    }
  }
  // Verify basic structure properties for root categories only
  for (const category of categories) {
    TestValidator.predicate(
      "name is not empty",
      category.name.trim().length > 0,
    );
    TestValidator.predicate(
      "description is string or null",
      category.description === null || typeof category.description === "string",
    );
  }
}
