import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a subcategory with parent category reference.
 *
 * Validates the category retrieval endpoint returns complete hierarchical information including parent category summary. Ensures that subcategories correctly reference their parent root category and that the two-level hierarchy is properly maintained.
 *
 * The test verifies:
 * 1. Category basic fields are present and valid
 * 2. Parent category reference exists as IEcommerceCategory.ISummary
 * 3. Empty subcategories array (subcategories are leaf nodes)
 * 4. Active status (deleted_at is null)
 *
 * 1. Generate a random category UUID.
 * 2. Call the category retrieval API with the UUID.
 * 3. Validate the response structure matches IEcommerceCategory.
 * 4. Verify parent field contains a valid IEcommerceCategory.ISummary.
 * 5. Confirm subcategories array is empty for subcategory.
 * 6. Assert deleted_at is null (category is active).
 */
export async function test_api_category_retrieve_subcategory_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate random category UUID for retrieval
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Retrieve the category by UUID
  const category: IEcommerceCategory =
    await api.functional.ecommerce.categories.at(connection, {
      categoryId,
    });
  // 3. Validate response structure
  typia.assert(category);
  // 4. Verify parent field exists and is properly structured
  // For a subcategory, parent should be an IEcommerceCategory.ISummary object
  if (category.parent !== null) {
    typia.assert(category.parent);
    // Business logic: parent should have valid id and name
    TestValidator.equals(
      "parent category has id",
      typeof category.parent.id,
      "string",
    );
    TestValidator.equals(
      "parent category has name",
      typeof category.parent.name,
      "string",
    );
  }
  // 5. Confirm subcategories array is empty (subcategories are leaf nodes)
  TestValidator.equals(
    "subcategories array is empty for subcategory",
    category.subcategories.length,
    0,
  );
  // 6. Assert deleted_at is null (category is active)
  TestValidator.equals("category is active", category.deleted_at, null);
}
