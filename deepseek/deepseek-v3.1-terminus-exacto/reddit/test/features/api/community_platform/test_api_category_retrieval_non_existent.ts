import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test retrieval of a category that does not exist in the system.
 *
 * This scenario validates proper error handling when requesting a category name
 * that has not been created or has been deleted. The test verifies that
 * appropriate error responses are returned for non-existent categories,
 * ensuring graceful degradation of the user experience.
 */
export async function test_api_category_retrieval_non_existent(
  connection: api.IConnection,
) {
  // Generate a random category name that is guaranteed not to exist
  const nonExistentCategoryName = RandomGenerator.alphaNumeric(20);

  // Attempt to retrieve the non-existent category and validate that it fails
  await TestValidator.error(
    "retrieving non-existent category should fail",
    async () => {
      await api.functional.communityPlatform.categories.at(connection, {
        categoryName: nonExistentCategoryName,
      });
    },
  );
}
