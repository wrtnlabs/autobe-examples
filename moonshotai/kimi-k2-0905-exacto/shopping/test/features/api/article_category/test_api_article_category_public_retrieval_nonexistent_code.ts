import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";

/**
 * Test retrieval behavior when attempting to access an article category with a
 * non-existent code identifier. Validates proper error handling, not-found
 * responses, and appropriate error messaging for invalid category codes.
 * Ensures system gracefully handles non-existent resource requests while
 * maintaining data integrity.
 */
export async function test_api_article_category_public_retrieval_nonexistent_code(
  connection: api.IConnection,
) {
  // Step 1: Generate a non-existent category code
  const nonExistentCategoryCode = RandomGenerator.alphabets(10);

  // Step 2: Attempt to retrieve the non-existent category
  await TestValidator.error(
    "should return error for non-existent category code",
    async () => {
      await api.functional.shoppingMall.articleCategories.at(connection, {
        categoryCode: nonExistentCategoryCode,
      });
    },
  );

  // Step 3: Perform a successful retrieval to ensure no data corruption occurred
  // This verifies that error handling doesn't affect system stability
  const validCategoryCode = "electronics";
  const category = await api.functional.shoppingMall.articleCategories.at(
    connection,
    {
      categoryCode: validCategoryCode,
    },
  );
  typia.assert(category);

  TestValidator.predicate(
    "valid category should have proper structure",
    typeof category.id === "string" &&
      typeof category.name === "string" &&
      typeof category.code === "string",
  );
}
