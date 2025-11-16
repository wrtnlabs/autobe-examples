import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

export async function test_api_category_retrieval_nonexistent_id(
  connection: api.IConnection,
) {
  // Generate a valid UUID that is extremely unlikely to exist in the system
  const nonexistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve a category with the non-existent ID
  // This should fail with a 404 error
  await TestValidator.error(
    "retrieving non-existent category should throw error",
    async () => {
      await api.functional.communityPlatform.categories.at(connection, {
        categoryId: nonexistentCategoryId,
      });
    },
  );
}
