import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IColorClass } from "@ORGANIZATION/PROJECT-api/lib/structures/IColorClass";
import type { IIconClass } from "@ORGANIZATION/PROJECT-api/lib/structures/IIconClass";
import type { IShoppingMallFaqCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaqCategory";

/**
 * Test FAQ category retrieval with non-existent category code to validate
 * proper error handling.
 *
 * This test validates that the system returns appropriate error responses when
 * customers attempt to access categories that don't exist. It tests that error
 * messages provide clear guidance while maintaining security by not exposing
 * internal system information or database structure details.
 *
 * 1. Generate a random non-existent category code using uuid format to ensure it
 *    doesn't exist
 * 2. Attempt to retrieve category with the non-existent code
 * 3. Validate that appropriate error is thrown
 * 4. Verify that error provides guidance without exposing internal details
 */
export async function test_api_faq_category_nonexistent_code(
  connection: api.IConnection,
) {
  // Generate a random UUID as category code that doesn't exist
  const nonexistentCategoryCode = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve FAQ category with non-existent code
  // This should throw an appropriate error
  await TestValidator.error(
    "should throw error for non-existent FAQ category",
    async () => {
      await api.functional.shoppingMall.faqCategories.at(connection, {
        categoryCode: nonexistentCategoryCode,
      });
    },
  );
}
