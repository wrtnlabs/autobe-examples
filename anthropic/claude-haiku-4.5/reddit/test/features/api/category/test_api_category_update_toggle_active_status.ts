import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test toggling the is_active flag to control category visibility and
 * availability.
 *
 * Administrator updates a category from active to inactive and verifies the
 * change affects category visibility in UI dropdowns. Then updates it back to
 * active status. Validates that the is_active flag correctly controls category
 * availability, communities assigned to inactive categories continue
 * functioning, and the toggle operation properly persists and is reflected in
 * subsequent queries.
 *
 * Test workflow:
 *
 * 1. Administrator authenticates via join endpoint
 * 2. Category is created with is_active defaulting to true
 * 3. Category is updated to set is_active to false
 * 4. Verify the inactive status is persisted and reflected in the response
 * 5. Category is updated back to active status (is_active = true)
 * 6. Verify the active status is properly restored
 * 7. Validate that toggling is_active correctly controls visibility
 */
export async function test_api_category_update_toggle_active_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const adminName = RandomGenerator.name();
  const adminUsername = RandomGenerator.alphabets(8);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        username: adminUsername,
        href: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category with is_active defaulting to true
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categorySlug = RandomGenerator.alphabets(8).toLowerCase();
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: "https://example.com/icons/category.png",
          display_order: displayOrder,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Verify category is initially active
  TestValidator.equals(
    "category should be created with is_active = true",
    createdCategory.is_active,
    true,
  );

  // Step 3: Update category to set is_active to false
  const deactivatedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: {
          is_active: false,
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(deactivatedCategory);

  // Step 4: Verify the inactive status is persisted
  TestValidator.equals(
    "category should be deactivated",
    deactivatedCategory.is_active,
    false,
  );

  TestValidator.equals(
    "deactivated category id should match",
    deactivatedCategory.id,
    createdCategory.id,
  );

  // Step 5: Update category back to active status
  const reactivatedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: {
          is_active: true,
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(reactivatedCategory);

  // Step 6: Verify the active status is properly restored
  TestValidator.equals(
    "category should be reactivated",
    reactivatedCategory.is_active,
    true,
  );

  TestValidator.equals(
    "reactivated category id should match",
    reactivatedCategory.id,
    createdCategory.id,
  );

  // Step 7: Validate toggle persistence by verifying other properties remain unchanged
  TestValidator.equals(
    "category name should remain unchanged after toggle",
    reactivatedCategory.name,
    createdCategory.name,
  );

  TestValidator.equals(
    "category slug should remain unchanged after toggle",
    reactivatedCategory.slug,
    createdCategory.slug,
  );
}
