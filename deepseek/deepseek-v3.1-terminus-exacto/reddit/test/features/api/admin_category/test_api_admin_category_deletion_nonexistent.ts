import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test category deletion attempt for a non-existent category name.
 *
 * Validates that the system properly handles deletion requests for categories
 * that don't exist by returning appropriate error responses. The test verifies
 * that deletion operations fail gracefully when targeting invalid category
 * identifiers and provide clear error messaging for administrative
 * troubleshooting.
 */
export async function test_api_admin_category_deletion_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator using admin join endpoint
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate a descriptive random category name that clearly does not exist
  const nonExistentCategoryName = `nonexistent-${RandomGenerator.alphaNumeric(8)}`;

  // Step 3: Attempt to delete the non-existent category and verify it fails
  await TestValidator.error(
    "deletion operation should fail for non-existent category names",
    async () => {
      await api.functional.communityPlatform.admin.categories.erase(
        connection,
        {
          categoryName: nonExistentCategoryName,
        },
      );
    },
  );
}
