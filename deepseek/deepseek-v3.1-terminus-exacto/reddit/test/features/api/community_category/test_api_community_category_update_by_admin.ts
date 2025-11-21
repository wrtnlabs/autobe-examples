import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test the complete workflow for updating category properties within a specific
 * community. An administrator creates a platform category, then updates its
 * properties within a community context. Validates that category updates
 * respect community-specific settings and maintain proper authorization checks
 * for administrative operations.
 */
export async function test_api_community_category_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a platform category
  const categoryName = RandomGenerator.alphabets(10);
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: {
        name: categoryName,
        display_name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Update the category within a community context
  const communitySlug = RandomGenerator.alphabets(8);
  const updatedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.communities.categories.putByCommunityslugAndCategoryname(
      connection,
      {
        communitySlug: communitySlug,
        categoryName: category.name,
        body: {
          display_name:
            "Updated " + RandomGenerator.paragraph({ sentences: 2 }),
          description: "Updated " + RandomGenerator.content({ paragraphs: 1 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          is_active: false,
          status: "archived",
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Validate the update was successful
  TestValidator.equals(
    "category ID should remain the same",
    updatedCategory.id,
    category.id,
  );
  TestValidator.equals(
    "category name should remain the same",
    updatedCategory.name,
    category.name,
  );
  TestValidator.notEquals(
    "display name should be updated",
    updatedCategory.display_name,
    category.display_name,
  );
  TestValidator.notEquals(
    "description should be updated",
    updatedCategory.description,
    category.description,
  );
  TestValidator.notEquals(
    "sort order should be updated",
    updatedCategory.sort_order,
    category.sort_order,
  );
  TestValidator.notEquals(
    "active status should be updated",
    updatedCategory.is_active,
    category.is_active,
  );
  TestValidator.notEquals(
    "status should be updated",
    updatedCategory.status,
    category.status,
  );

  // Validate that the updated category has the expected properties
  TestValidator.predicate(
    "updated category should contain 'Updated' in display name",
    updatedCategory.display_name.includes("Updated"),
  );
  TestValidator.predicate(
    "updated category should contain 'Updated' in description",
    updatedCategory.description.includes("Updated"),
  );
  TestValidator.predicate(
    "category should be inactive after update",
    updatedCategory.is_active === false,
  );
  TestValidator.equals(
    "category status should be archived",
    updatedCategory.status,
    "archived",
  );

  // Additional validation: Test error scenario for non-existent category
  await TestValidator.error(
    "should fail when updating non-existent category",
    async () => {
      await api.functional.communityPlatform.admin.communities.categories.putByCommunityslugAndCategoryname(
        connection,
        {
          communitySlug: communitySlug,
          categoryName: "non-existent-category",
          body: {
            display_name: "Attempted update",
          } satisfies ICommunityPlatformCategory.IUpdate,
        },
      );
    },
  );
}
