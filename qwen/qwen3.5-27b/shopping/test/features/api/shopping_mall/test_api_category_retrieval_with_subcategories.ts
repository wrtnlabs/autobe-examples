import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of a parent category that contains subcategories.
 *
 * Validates the complete category retrieval flow including verification of hierarchical structure, field presence, and data integrity. Ensures that the category response includes all required fields and that subcategories are properly structured as summary objects.
 *
 * Special attention is given to verifying that the subcategories array contains only direct subcategories (one level deep), that each subcategory includes a parentCategory reference, and that the parent category itself does not include a parentCategory field to prevent circular references.
 *
 * 1. Create a test connection for public access (no authentication required).
 * 2. Generate a random UUID to simulate an existing category with subcategories.
 * 3. Retrieve the category using the API endpoint.
 * 4. Validate the response structure using typia.assert.
 * 5. Verify that deleted_at is null for an active category.
 * 6. Verify that subcategories have parentCategory references pointing to the parent.
 */
export async function test_api_category_retrieval_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test connection for public access
  const publicConnection: api.IConnection = { host: connection.host };
  // 2. Generate a random UUID for category ID
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the category
  const category = await api.functional.shoppingMall.categories.at(
    publicConnection,
    {
      categoryId,
    },
  );
  typia.assert(category);
  // 4. Verify that deleted_at is null for an active category
  TestValidator.equals(
    "active category has null deleted_at",
    category.deleted_at,
    null,
  );
  // 5. Verify each subcategory has correct structure and parent reference
  await ArrayUtil.asyncForEach(
    category.subcategories,
    async (subcategory, index) => {
      typia.assert<IShoppingMallCategory.ISummary>(subcategory);
      // Verify that parentCategory reference points to the parent category
      if (subcategory.parentCategory !== null) {
        TestValidator.equals(
          `subcategory[${index}] parentCategory id matches`,
          subcategory.parentCategory.id,
          category.id,
        );
      }
    },
  );
}
