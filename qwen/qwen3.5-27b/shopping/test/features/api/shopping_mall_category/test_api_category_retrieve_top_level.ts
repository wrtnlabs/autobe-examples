import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_retrieve_top_level(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving a top-level category with subcategories.
   *
   * This test validates the category retrieval endpoint by:
   * 1. Using simulation mode to generate a valid category response
   * 2. Retrieving the category using GET /shoppingMall/categories/{categoryId}
   * 3. Validating the hierarchical structure and all fields
   * 4. Verifying parent is null (top-level) and subcategories array exists
   */
  // 1. Generate a random category ID for retrieval
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 2. Enable simulation mode to generate valid test data
  const simulateConnection: api.IConnection = {
    ...connection,
    simulate: true,
  };
  // 3. Retrieve the category (simulation will generate valid response)
  const retrievedCategory = await api.functional.shoppingMall.categories.at(
    simulateConnection,
    {
      categoryId,
    },
  );
  typia.assert(retrievedCategory);
  // 4. Validate category id matches request
  TestValidator.equals(
    "category id matches request",
    retrievedCategory.id,
    categoryId,
  );
  // 5. Validate required fields exist
  TestValidator.predicate("has name", retrievedCategory.name.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    !!retrievedCategory.created_at,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    !!retrievedCategory.updated_at,
  );
  // 6. Validate parent is null or undefined (top-level category)
  // Note: ISummary.parent is nullable, so we check for null/undefined
  if (retrievedCategory.parent !== undefined) {
    TestValidator.equals(
      "parent is null for top-level category",
      retrievedCategory.parent,
      null,
    );
  }
  // 7. Validate subcategories array exists
  TestValidator.predicate(
    "subcategories is an array",
    Array.isArray(retrievedCategory.subcategories),
  );
  // 8. Validate each subcategory structure (if any exist)
  await ArrayUtil.asyncForEach(
    retrievedCategory.subcategories,
    async (subcat) => {
      TestValidator.predicate("subcategory has id", !!subcat.id);
      TestValidator.predicate("subcategory has name", !!subcat.name);
      TestValidator.predicate(
        "subcategory has created_at",
        !!subcat.created_at,
      );
      // Subcategory parent should reference the top-level category
      TestValidator.equals(
        "subcategory parent id matches",
        subcat.parent?.id,
        retrievedCategory.id,
      );
    },
  );
}
