import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test category creation with various invalid data scenarios focusing on
 * business logic validation rather than type errors. This scenario validates
 * that the API properly rejects requests that violate business rules while
 * maintaining type safety.
 */
export async function test_api_category_creation_invalid_data(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a valid category to test uniqueness constraint
  const validCategory =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: {
        name: "valid-category",
        display_name: "Valid Category",
        description: "A valid category for testing",
        sort_order: 1,
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformCategory.ICreate,
    });
  typia.assert(validCategory);

  // Test 1: Duplicate category name (business logic validation)
  await TestValidator.error(
    "should reject category creation with duplicate name",
    async () => {
      await api.functional.communityPlatform.admin.categories.create(
        connection,
        {
          body: {
            name: "valid-category", // Same name as existing category
            display_name: "Duplicate Name Category",
            description: "Category with duplicate name",
            sort_order: 2,
            is_active: true,
            status: "active",
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Test 2: Valid category creation with different name (success case for comparison)
  const secondCategory =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: {
        name: "second-valid-category",
        display_name: "Second Valid Category",
        description: "Another valid category for testing",
        sort_order: 3,
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformCategory.ICreate,
    });
  typia.assert(secondCategory);

  // Verify the second category was created successfully
  TestValidator.equals(
    "second category should have different name",
    secondCategory.name,
    "second-valid-category",
  );
}
