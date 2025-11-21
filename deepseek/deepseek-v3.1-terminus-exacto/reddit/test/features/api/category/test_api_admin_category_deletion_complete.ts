import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test complete category deletion workflow where an administrator creates a
 * category and then permanently deletes it from the platform. Validates that
 * category deletion removes the category from the system and prevents future
 * associations with communities or posts. The test should verify that deleted
 * categories are no longer accessible and that deletion operations follow
 * proper administrative authorization protocols.
 */
export async function test_api_admin_category_deletion_complete(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a new category using the admin credentials
  const categoryName = RandomGenerator.alphaNumeric(10);
  const categoryDisplayName = RandomGenerator.paragraph({ sentences: 3 });

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: {
        name: categoryName,
        display_name: categoryDisplayName,
        description: RandomGenerator.content({ paragraphs: 2 }),
        icon_url: undefined,
        color_hex: undefined,
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
        >(),
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformCategory.ICreate,
    });
  typia.assert(createdCategory);

  // Step 3: Validate the category was created successfully
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category display name matches input",
    createdCategory.display_name,
    categoryDisplayName,
  );
  TestValidator.predicate(
    "category should be active",
    createdCategory.is_active,
  );
  TestValidator.equals(
    "category status should be active",
    createdCategory.status,
    "active",
  );
  TestValidator.predicate(
    "category should have creation timestamp",
    createdCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "category should have creator information",
    createdCategory.created_by !== undefined,
  );

  // Step 4: Delete the category using the unique category name
  const deletedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.erase(connection, {
      categoryName: categoryName,
    });
  typia.assert(deletedCategory);

  // Step 5: Verify the deletion operation returns the deleted category data
  TestValidator.equals(
    "deleted category ID matches created category ID",
    deletedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "deleted category name matches",
    deletedCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "deleted category display name matches",
    deletedCategory.display_name,
    categoryDisplayName,
  );

  // Step 6: Attempt to delete the same category again to confirm it's no longer available
  await TestValidator.error(
    "deleting already deleted category should fail",
    async () => {
      await api.functional.communityPlatform.admin.categories.erase(
        connection,
        {
          categoryName: categoryName,
        },
      );
    },
  );

  // Step 7: Validate that proper authorization protocols are enforced
  // Create unauthenticated connection to test authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated user cannot delete categories",
    async () => {
      await api.functional.communityPlatform.admin.categories.erase(
        unauthConn,
        {
          categoryName: categoryName,
        },
      );
    },
  );

  // Additional validation: Test with non-existent category
  await TestValidator.error(
    "deleting non-existent category should fail",
    async () => {
      await api.functional.communityPlatform.admin.categories.erase(
        connection,
        {
          categoryName: "non_existent_category_12345",
        },
      );
    },
  );

  // Final validation: Ensure the deletion workflow is complete
  TestValidator.predicate(
    "admin authentication was successful",
    admin.id !== undefined,
  );
  TestValidator.predicate(
    "category creation was successful",
    createdCategory.id !== undefined,
  );
  TestValidator.predicate(
    "category deletion was successful",
    deletedCategory.id !== undefined,
  );
}
