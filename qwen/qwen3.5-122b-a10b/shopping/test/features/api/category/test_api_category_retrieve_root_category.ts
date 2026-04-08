import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a root category by its unique identifier.
 *
 * Validates the successful retrieval of a root-level category (top-level category with no parent) from the e-commerce category hierarchy. This test ensures that the category endpoint correctly returns complete category information including hierarchical relationships.
 *
 * The test verifies that root categories are properly identified by having a null parent reference, while maintaining the ability to list their subcategories. It also validates that active categories have null deleted_at timestamps.
 *
 * 1. Generate a random UUID to use as the category identifier.
 * 2. Call the category retrieval endpoint with the generated UUID.
 * 3. Validate the response structure matches IEcommerceCategory type.
 * 4. Verify the category is a root category (parent === null).
 * 5. Verify the subcategories array exists and elements are valid summaries.
 * 6. Verify the category is active (deleted_at === null).
 * 7. Verify all required timestamp fields are present and valid.
 */
export async function test_api_category_retrieve_root_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a random UUID for the category identifier
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Call the category retrieval endpoint
  const category: IEcommerceCategory =
    await api.functional.ecommerce.categories.at(connection, {
      categoryId,
    });
  // 3. Validate the response structure matches IEcommerceCategory type
  typia.assert(category);
  // 4. Verify the category is a root category (parent === null)
  TestValidator.equals("root category has null parent", category.parent, null);
  // 5. Verify the subcategories array exists (can be empty for leaf root categories)
  TestValidator.predicate(
    "subcategories is an array",
    Array.isArray(category.subcategories),
  );
  // Validate each subcategory has required summary fields
  for (const subcategory of category.subcategories) {
    typia.assert(subcategory satisfies IEcommerceCategory.ISummary);
    TestValidator.predicate(
      "subcategory has valid id",
      subcategory.id.length > 0,
    );
    TestValidator.predicate(
      "subcategory has valid name",
      subcategory.name.length > 0,
    );
  }
  // 6. Verify the category is active (deleted_at === null)
  TestValidator.equals("category is active", category.deleted_at, null);
  // 7. Verify all required timestamp fields are present and valid
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    !isNaN(Date.parse(category.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    !isNaN(Date.parse(category.updated_at)),
  );
  // 8. Verify basic category properties exist
  TestValidator.predicate("category has id", category.id.length > 0);
  TestValidator.predicate("category has name", category.name.length > 0);
}
