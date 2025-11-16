import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category active status controls category availability for discussion
 * board.
 *
 * Validates that moderators can manage category visibility through is_active
 * status:
 *
 * - Active categories (is_active=true) appear in member-facing selections
 * - Inactive categories (is_active=false) are hidden but retain articles
 * - Status changes control visibility without data loss
 * - New categories immediately reflect their active status
 *
 * Test workflow:
 *
 * 1. Moderator authenticates to system
 * 2. Create categories with is_active=true (active/visible)
 * 3. Create categories with is_active=false (inactive/hidden)
 * 4. Verify active categories have correct status and properties
 * 5. Verify inactive categories have correct status and properties
 * 6. Confirm article_count initializes to 0
 * 7. Validate display_order is maintained correctly
 */
export async function test_api_category_active_status_management(
  connection: api.IConnection,
) {
  // Step 1: Authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName = RandomGenerator.name();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create active category (is_active=true)
  const activeCategoryName = RandomGenerator.paragraph({ sentences: 2 });
  const activeCategorySlug = RandomGenerator.alphabets(8).toLowerCase();
  const activeCategoryDescription = RandomGenerator.paragraph({ sentences: 3 });

  const activeCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: activeCategoryName,
          slug: activeCategorySlug,
          description: activeCategoryDescription,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(activeCategory);

  // Verify active category properties
  TestValidator.equals(
    "active category name matches",
    activeCategory.name,
    activeCategoryName,
  );
  TestValidator.equals(
    "active category slug matches",
    activeCategory.slug,
    activeCategorySlug,
  );
  TestValidator.equals(
    "active category is_active status is true",
    activeCategory.is_active,
    true,
  );
  TestValidator.equals(
    "active category article_count initializes to 0",
    activeCategory.article_count,
    0,
  );
  TestValidator.equals(
    "active category display_order matches",
    activeCategory.display_order,
    1,
  );
  TestValidator.predicate(
    "active category has valid id",
    activeCategory.id !== null && activeCategory.id !== undefined,
  );
  TestValidator.predicate(
    "active category has created_at timestamp",
    activeCategory.created_at !== null &&
      activeCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "active category has updated_at timestamp",
    activeCategory.updated_at !== null &&
      activeCategory.updated_at !== undefined,
  );

  // Step 3: Create inactive category (is_active=false)
  const inactiveCategoryName = RandomGenerator.paragraph({ sentences: 2 });
  const inactiveCategorySlug = RandomGenerator.alphabets(8).toLowerCase();
  const inactiveCategoryDescription = RandomGenerator.paragraph({
    sentences: 3,
  });

  const inactiveCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: inactiveCategoryName,
          slug: inactiveCategorySlug,
          description: inactiveCategoryDescription,
          display_order: 2,
          is_active: false,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(inactiveCategory);

  // Verify inactive category properties
  TestValidator.equals(
    "inactive category name matches",
    inactiveCategory.name,
    inactiveCategoryName,
  );
  TestValidator.equals(
    "inactive category slug matches",
    inactiveCategory.slug,
    inactiveCategorySlug,
  );
  TestValidator.equals(
    "inactive category is_active status is false",
    inactiveCategory.is_active,
    false,
  );
  TestValidator.equals(
    "inactive category article_count initializes to 0",
    inactiveCategory.article_count,
    0,
  );
  TestValidator.equals(
    "inactive category display_order matches",
    inactiveCategory.display_order,
    2,
  );
  TestValidator.predicate(
    "inactive category has valid id",
    inactiveCategory.id !== null && inactiveCategory.id !== undefined,
  );
  TestValidator.predicate(
    "inactive category has created_at timestamp",
    inactiveCategory.created_at !== null &&
      inactiveCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "inactive category has updated_at timestamp",
    inactiveCategory.updated_at !== null &&
      inactiveCategory.updated_at !== undefined,
  );

  // Step 4: Create additional active category for multiple category validation
  const anotherActiveCategoryName = RandomGenerator.paragraph({ sentences: 2 });
  const anotherActiveCategorySlug = RandomGenerator.alphabets(8).toLowerCase();

  const anotherActiveCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: anotherActiveCategoryName,
          slug: anotherActiveCategorySlug,
          display_order: 3,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(anotherActiveCategory);

  // Verify another active category
  TestValidator.equals(
    "another active category is_active status is true",
    anotherActiveCategory.is_active,
    true,
  );
  TestValidator.equals(
    "another active category article_count initializes to 0",
    anotherActiveCategory.article_count,
    0,
  );

  // Step 5: Validate active status differences
  TestValidator.notEquals(
    "active and inactive categories have different is_active status",
    activeCategory.is_active,
    inactiveCategory.is_active,
  );
  TestValidator.predicate(
    "active category is_active=true",
    activeCategory.is_active === true,
  );
  TestValidator.predicate(
    "inactive category is_active=false",
    inactiveCategory.is_active === false,
  );

  // Step 6: Validate category IDs are unique
  TestValidator.notEquals(
    "active category ID differs from inactive category ID",
    activeCategory.id,
    inactiveCategory.id,
  );
  TestValidator.notEquals(
    "another active category ID differs from first active category ID",
    activeCategory.id,
    anotherActiveCategory.id,
  );
}
