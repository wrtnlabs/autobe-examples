import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test retrieval behavior when providing an invalid UUID format in the
 * categoryId parameter.
 *
 * NOTE: This test scenario cannot be implemented as originally specified
 * because the API function signature enforces UUID format validation at the
 * TypeScript compile-time level through the `tags.Format<"uuid">` constraint.
 * Attempting to send invalid UUID formats would require bypassing TypeScript's
 * type system, which violates type safety principles and compilation rules.
 *
 * Instead, this implementation validates that the API correctly handles the
 * retrieval of categories with properly formatted UUID identifiers and responds
 * appropriately when attempting to retrieve non-existent categories (which is
 * the actual runtime error scenario possible with valid UUIDs).
 */
export async function test_api_category_retrieval_invalid_id_format(
  connection: api.IConnection,
) {
  // Generate a valid UUID format for testing
  const validUuid = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Verify that API properly handles non-existent category with valid UUID format
  // This is the appropriate runtime error scenario given the type constraints
  await TestValidator.error(
    "should return error when attempting to retrieve non-existent category",
    async () => {
      await api.functional.communityPlatform.categories.at(connection, {
        categoryId: validUuid,
      });
    },
  );
}
