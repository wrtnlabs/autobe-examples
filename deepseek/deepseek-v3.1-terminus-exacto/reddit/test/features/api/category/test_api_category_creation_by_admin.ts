import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test successful creation of a new category by an authenticated administrator.
 *
 * This test validates the complete category creation workflow including
 * authentication, request validation, and proper response formatting. The test
 * ensures that all required fields are properly validated, the category is
 * created with correct metadata, and administrative tracking information is
 * correctly recorded.
 */
export async function test_api_category_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "content_manager",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a new category with comprehensive test data
  const categoryData = {
    name: RandomGenerator.alphabets(10).toLowerCase(),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    color_hex: "#FF5733",
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    is_active: true,
    status: "active" as const,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 3: Validate the created category matches input data
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category display name matches input",
    category.display_name,
    categoryData.display_name,
  );
  TestValidator.equals(
    "category description matches input",
    category.description,
    categoryData.description,
  );
  TestValidator.equals(
    "category icon URL matches input",
    category.icon_url,
    categoryData.icon_url,
  );
  TestValidator.equals(
    "category color hex matches input",
    category.color_hex,
    categoryData.color_hex,
  );
  TestValidator.equals(
    "category sort order matches input",
    category.sort_order,
    categoryData.sort_order,
  );
  TestValidator.equals(
    "category active status matches input",
    category.is_active,
    categoryData.is_active,
  );
  TestValidator.equals(
    "category status matches input",
    category.status,
    categoryData.status,
  );

  // Step 4: Validate system-generated fields (typia.assert already validates everything)
  TestValidator.predicate(
    "category has creation timestamp",
    category.created_at !== undefined,
  );
  TestValidator.predicate(
    "category has update timestamp",
    category.updated_at !== undefined,
  );
  TestValidator.equals(
    "category deleted_at is undefined for active category",
    category.deleted_at,
    undefined,
  );

  // Step 5: Validate administrative tracking
  TestValidator.equals(
    "category created by matches admin ID",
    category.created_by.id,
    admin.id,
  );
  TestValidator.equals(
    "category created by display name matches admin",
    category.created_by.display_name,
    admin.display_name,
  );
  TestValidator.equals(
    "category created by admin level matches",
    category.created_by.admin_level,
    admin.admin_level,
  );
}
