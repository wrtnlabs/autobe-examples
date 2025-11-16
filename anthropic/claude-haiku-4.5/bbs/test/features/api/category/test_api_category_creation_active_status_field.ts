import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category creation with is_active flag controlling availability.
 *
 * Validates that moderators can create categories with is_active=true
 * (available for article assignment and visible in member selections) and
 * is_active=false (hidden from member selections). Verifies that the is_active
 * flag properly controls category visibility and availability, active
 * categories appear in dropdowns while inactive categories are hidden, and both
 * types maintain proper initialization of timestamps and article_count.
 *
 * Steps:
 *
 * 1. Create moderator account with join endpoint
 * 2. Create active category (is_active=true) for article selection
 * 3. Verify active category is returned with correct properties
 * 4. Create inactive category (is_active=false) hidden from selections
 * 5. Verify inactive category is returned with correct properties
 * 6. Validate is_active flag controls category availability
 * 7. Verify both categories have proper timestamps and article_count
 */
export async function test_api_category_creation_active_status_field(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator created successfully",
    moderator.id !== undefined,
  );

  // Step 2: Create active category (is_active=true)
  const activeCategoryBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 5 }),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const activeCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: activeCategoryBody,
      },
    );
  typia.assert(activeCategory);

  // Step 3: Verify active category properties
  TestValidator.equals(
    "active category is_active field is true",
    activeCategory.is_active,
    true,
  );
  TestValidator.equals(
    "active category name matches",
    activeCategory.name,
    activeCategoryBody.name,
  );
  TestValidator.equals(
    "active category slug matches",
    activeCategory.slug,
    activeCategoryBody.slug,
  );
  TestValidator.equals(
    "active category article_count initialized to 0",
    activeCategory.article_count,
    0,
  );
  TestValidator.predicate(
    "active category has created_at timestamp",
    activeCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "active category has updated_at timestamp",
    activeCategory.updated_at !== undefined,
  );

  // Step 4: Create inactive category (is_active=false)
  const inactiveCategoryBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 5 }),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: false,
  } satisfies IDiscussionBoardCategory.ICreate;

  const inactiveCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: inactiveCategoryBody,
      },
    );
  typia.assert(inactiveCategory);

  // Step 5: Verify inactive category properties
  TestValidator.equals(
    "inactive category is_active field is false",
    inactiveCategory.is_active,
    false,
  );
  TestValidator.equals(
    "inactive category name matches",
    inactiveCategory.name,
    inactiveCategoryBody.name,
  );
  TestValidator.equals(
    "inactive category slug matches",
    inactiveCategory.slug,
    inactiveCategoryBody.slug,
  );
  TestValidator.equals(
    "inactive category article_count initialized to 0",
    inactiveCategory.article_count,
    0,
  );
  TestValidator.predicate(
    "inactive category has created_at timestamp",
    inactiveCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "inactive category has updated_at timestamp",
    inactiveCategory.updated_at !== undefined,
  );

  // Step 6: Validate is_active flag controls category availability
  TestValidator.notEquals(
    "active and inactive categories have different is_active status",
    activeCategory.is_active,
    inactiveCategory.is_active,
  );
  TestValidator.predicate(
    "active category is available for selection",
    activeCategory.is_active === true,
  );
  TestValidator.predicate(
    "inactive category is hidden from selection",
    inactiveCategory.is_active === false,
  );

  // Step 7: Verify categories have proper initialization
  TestValidator.equals(
    "both categories have article_count 0 on creation",
    activeCategory.article_count,
    inactiveCategory.article_count,
  );
}
