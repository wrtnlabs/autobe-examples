import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that category update enforces slug uniqueness constraint.
 *
 * This test validates that when an administrator attempts to update a
 * category's slug to match an existing category's slug, the operation fails
 * with an appropriate validation error. The test also validates successful slug
 * updates when the new slug is unique.
 *
 * Business Context: Categories are used for organizing communities on the
 * platform. Each category must have a unique slug for URL-safe identification
 * and API parameter usage. The system must enforce this uniqueness constraint
 * during updates to prevent conflicts.
 *
 * Test Steps:
 *
 * 1. Administrator authenticates to the system
 * 2. Create first category with a unique slug
 * 3. Create second category with a different unique slug
 * 4. Attempt to update second category's slug to match the first (should fail)
 * 5. Successfully update second category's slug to a new unique value
 * 6. Verify the slug was updated correctly and the category identity is preserved
 */
export async function test_api_category_update_slug_uniqueness(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create first category with unique slug
  const firstSlug = "technology";
  const firstCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: firstSlug,
          description: "Technology and software communities",
          icon_url: null,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  TestValidator.equals(
    "first category slug matches",
    firstCategory.slug,
    firstSlug,
  );

  // Step 3: Create second category with different slug
  const secondSlug = "entertainment";
  const secondCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Entertainment",
          slug: secondSlug,
          description: "Entertainment and media communities",
          icon_url: null,
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(secondCategory);
  TestValidator.equals(
    "second category slug matches",
    secondCategory.slug,
    secondSlug,
  );

  // Step 4: Attempt to update second category with duplicate slug (should fail)
  await TestValidator.error(
    "cannot update category with duplicate slug",
    async () => {
      await api.functional.communityPlatform.administrator.categories.update(
        connection,
        {
          categoryId: secondCategory.id,
          body: {
            slug: firstSlug, // Attempting to use existing slug
          } satisfies ICommunityPlatformCategory.IUpdate,
        },
      );
    },
  );

  // Step 5: Successfully update second category with unique slug
  const newSlug = "music";
  const updatedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.update(
      connection,
      {
        categoryId: secondCategory.id,
        body: {
          slug: newSlug,
        } satisfies ICommunityPlatformCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 6: Verify the slug was updated correctly and category identity is preserved
  TestValidator.equals(
    "updated category slug matches new value",
    updatedCategory.slug,
    newSlug,
  );
  TestValidator.equals(
    "updated category ID matches original category ID",
    updatedCategory.id,
    secondCategory.id,
  );
}
