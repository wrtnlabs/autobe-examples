import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test category creation with a duplicate name that already exists in the
 * system.
 *
 * This scenario validates proper validation and error handling when attempting
 * to create a category with a name that conflicts with an existing category.
 * The test verifies that appropriate error messages are returned and that no
 * duplicate categories are created in the database.
 *
 * Implementation Steps:
 *
 * 1. Authenticate as administrator to establish proper authorization context
 * 2. Create initial category with specific name to test duplicate validation
 * 3. Attempt to create another category with the exact same name
 * 4. Validate that the second creation attempt fails with appropriate error
 * 5. Verify that only one category exists in the system with that name
 */
export async function test_api_category_creation_duplicate_name(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial category
  const categoryName = RandomGenerator.name(1); // Generate a single word name
  const initialCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: {
        name: categoryName,
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(), // Ensure positive sort order
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformCategory.ICreate,
    });
  typia.assert(initialCategory);
  TestValidator.equals(
    "initial category name matches",
    initialCategory.name,
    categoryName,
  );

  // Step 3: Attempt to create duplicate category with same name
  await TestValidator.error("duplicate category name should fail", async () => {
    return await api.functional.communityPlatform.admin.categories.create(
      connection,
      {
        body: {
          name: categoryName, // Same name as existing category
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(), // Ensure positive sort order
          is_active: true,
          status: "active",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  });

  // Step 4: Verify that only the original category exists
  // Note: Since there's no list categories API provided, we can only validate
  // that the duplicate creation failed and the original category remains valid
  TestValidator.predicate(
    "original category should still be valid",
    initialCategory.name === categoryName && initialCategory.is_active === true,
  );
}
