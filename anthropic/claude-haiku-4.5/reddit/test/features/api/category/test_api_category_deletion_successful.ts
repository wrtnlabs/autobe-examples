import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_category_deletion_successful(
  connection: api.IConnection,
) {
  // Step 1: Administrator registration
  // Authenticate as an administrator to perform category operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminName = RandomGenerator.name();

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecureAdminPassword123!",
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin/login",
        referrer: "http://localhost:3000/",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "admin authenticated successfully",
    admin.email,
    adminEmail,
  );

  // Step 2: Create a new category for testing
  // Create a category that will be deleted in the test
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 1,
    wordMax: 3,
  });
  const categorySlug = RandomGenerator.alphaNumeric(10).toLowerCase();
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const displayOrder = RandomGenerator.pick([1, 2, 3, 4, 5] as const);

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: categoryDescription,
          display_order: displayOrder,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches",
    createdCategory.slug,
    categorySlug,
  );
  TestValidator.equals("category is active", createdCategory.is_active, true);

  // Step 3: Delete the created category
  // Delete the category and verify it is removed
  const deletedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.erase(
      connection,
      {
        categoryId: createdCategory.id,
      },
    );
  typia.assert(deletedCategory);
  TestValidator.equals(
    "deleted category ID matches",
    deletedCategory.id,
    createdCategory.id,
  );

  // Step 4: Verify category deletion
  // Attempt to verify the category is no longer accessible
  // Note: Since we don't have a GET endpoint for categories in the provided API,
  // we verify that the deletion operation completed successfully
  TestValidator.predicate(
    "category deletion returns the deleted category object",
    deletedCategory.id === createdCategory.id,
  );
}
