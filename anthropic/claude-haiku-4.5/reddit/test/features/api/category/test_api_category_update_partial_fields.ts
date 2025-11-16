import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test partial category update with selective field modification.
 *
 * This test validates that the category update endpoint correctly handles
 * partial updates where only specific fields are modified while others remain
 * unchanged. The test ensures:
 *
 * 1. Administrator authentication and authorization for category operations
 * 2. Initial category creation with complete properties
 * 3. Partial update with only name and display_order modifications
 * 4. Verification that omitted fields (slug, description, icon_url, is_active)
 *    preserve their original values
 * 5. Confirmation that only provided fields are updated in the response
 *
 * Process:
 *
 * 1. Administrator joins the platform
 * 2. Administrator creates a category with initial values
 * 3. Administrator updates only name and display_order
 * 4. Validate that updated fields reflect new values
 * 5. Validate that omitted fields retain original values
 */
export async function test_api_category_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com",
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial category with complete properties
  const initialCategoryName = RandomGenerator.paragraph({ sentences: 2 });
  const initialSlug = RandomGenerator.alphabets(10).toLowerCase();
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialIconUrl = "https://example.com/icon.png";
  const initialDisplayOrder = 5;

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: initialCategoryName,
          slug: initialSlug,
          description: initialDescription,
          icon_url: initialIconUrl,
          display_order: initialDisplayOrder,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Validate initial category creation
  TestValidator.equals(
    "created category ID exists",
    typeof createdCategory.id === "string",
    true,
  );
  TestValidator.equals(
    "created category name matches",
    createdCategory.name,
    initialCategoryName,
  );
  TestValidator.equals(
    "created category slug matches",
    createdCategory.slug,
    initialSlug,
  );
  TestValidator.equals(
    "created category description matches",
    createdCategory.description,
    initialDescription,
  );
  TestValidator.equals(
    "created category icon_url matches",
    createdCategory.icon_url,
    initialIconUrl,
  );
  TestValidator.equals(
    "created category display_order matches",
    createdCategory.display_order,
    initialDisplayOrder,
  );
  TestValidator.equals(
    "created category is_active is true by default",
    createdCategory.is_active,
    true,
  );

  // Step 3: Perform partial update with only name and display_order
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDisplayOrder = 15;

  const partiallyUpdatedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: {
          name: updatedName,
          display_order: updatedDisplayOrder,
          // Deliberately omit: slug, description, icon_url, is_active
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(partiallyUpdatedCategory);

  // Step 4: Validate partial update results

  // Updated fields should reflect new values
  TestValidator.equals(
    "category ID unchanged after update",
    partiallyUpdatedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name updated correctly",
    partiallyUpdatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "category display_order updated correctly",
    partiallyUpdatedCategory.display_order,
    updatedDisplayOrder,
  );

  // Step 5: Validate that omitted fields preserve original values
  TestValidator.equals(
    "slug preserved after partial update",
    partiallyUpdatedCategory.slug,
    initialSlug,
  );
  TestValidator.equals(
    "description preserved after partial update",
    partiallyUpdatedCategory.description,
    initialDescription,
  );
  TestValidator.equals(
    "icon_url preserved after partial update",
    partiallyUpdatedCategory.icon_url,
    initialIconUrl,
  );
  TestValidator.equals(
    "is_active preserved after partial update",
    partiallyUpdatedCategory.is_active,
    true,
  );

  // Validate timestamps are updated
  TestValidator.predicate(
    "updated_at timestamp is later than created_at",
    new Date(partiallyUpdatedCategory.updated_at).getTime() >=
      new Date(createdCategory.updated_at).getTime(),
  );
}
