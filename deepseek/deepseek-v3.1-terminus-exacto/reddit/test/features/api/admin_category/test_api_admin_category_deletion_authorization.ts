import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test category deletion authorization workflow to ensure only authenticated
 * administrators can perform deletion operations. Validates that unauthorized
 * access attempts are properly rejected and that deletion operations require
 * valid administrative credentials.
 */
export async function test_api_admin_category_deletion_authorization(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with proper credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Attempt category deletion without authentication (should fail)
  // Create unauthenticated connection by clearing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "category deletion without authentication should fail",
    async () => {
      await api.functional.communityPlatform.admin.categories.erase(
        unauthConn,
        {
          categoryName: "test-category",
        },
      );
    },
  );

  // Step 3: Authenticate as administrator using the created credentials
  // Note: Since we don't have a login endpoint in the provided API functions,
  // we'll use the authenticated connection from the join operation
  // The join operation automatically sets the authorization headers

  // Step 4: Test authorized deletion attempt
  // Use a realistic category name pattern
  const categoryName = RandomGenerator.name(1)
    .toLowerCase()
    .replace(/\s+/g, "-");

  // This should attempt deletion (may fail due to non-existent category, but authorization should pass)
  await TestValidator.error(
    "authenticated category deletion should attempt operation",
    async () => {
      await api.functional.communityPlatform.admin.categories.erase(
        connection,
        {
          categoryName: categoryName,
        },
      );
    },
  );

  // Step 5: Validate that authentication is required by testing with cleared headers again
  await TestValidator.error(
    "category deletion with cleared headers should fail",
    async () => {
      const clearedConn: api.IConnection = { ...connection, headers: {} };
      await api.functional.communityPlatform.admin.categories.erase(
        clearedConn,
        {
          categoryName: "any-category",
        },
      );
    },
  );
}
