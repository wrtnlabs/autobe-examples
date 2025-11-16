import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test category creation with comprehensive validation rules including unique
 * codes, display order requirements, and proper field validation.
 *
 * This comprehensive test validates the economic discussion category creation
 * system by testing:
 *
 * 1. Basic category creation with valid data
 * 2. Code uniqueness validation (preventing duplicate category codes)
 * 3. Display order constraints (ensuring proper sequential ordering)
 * 4. Name validation (required fields with length constraints)
 * 5. Active/inactive category state management
 * 6. Optional description field handling
 *
 * The test ensures moderators can create categories with appropriate
 * constraints while maintaining system integrity and proper categorization
 * standards for the platform.
 */
export async function test_api_moderator_category_creation_validation(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphabets(64),
      moderation_level: "category_manager",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create first category with valid data
  const categoryCode1 = RandomGenerator.alphabets(5);
  const firstCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: categoryCode1,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({
            sentences: RandomGenerator.pick([3, 4, 5]),
            wordMin: 4,
            wordMax: 8,
          }),
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(firstCategory);

  // Step 3: Test code uniqueness by creating a category with duplicate code (should fail)
  await TestValidator.error("duplicate category code should fail", async () => {
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: categoryCode1, // Same code as first category
          name: RandomGenerator.name(2),
          display_order: 2,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  });

  // Step 4: Create second category with different code and display order
  const categoryCode2 = RandomGenerator.alphabets(5);
  const secondCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: categoryCode2,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({
            sentences: RandomGenerator.pick([3, 4, 5]),
            wordMin: 4,
            wordMax: 8,
          }),
          display_order: 2,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(secondCategory);

  // Step 5: Test display order validation with duplicate display order (should work - not unique constraint)
  const categoryCode3 = RandomGenerator.alphabets(5);
  const thirdCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: categoryCode3,
          name: RandomGenerator.name(2),
          display_order: 2, // Same display order as second category (this is allowed)
          is_active: false, // Create inactive category
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(thirdCategory);

  // Step 6: Test validation with high display order number
  const categoryCode4 = RandomGenerator.alphabets(5);
  const fourthCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: categoryCode4,
          name: RandomGenerator.name(2),
          description: null, // Test null description
          display_order: 999,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(fourthCategory);

  // Step 7: Validate all categories were created correctly
  TestValidator.equals(
    "first category code matches",
    firstCategory.code,
    categoryCode1,
  );
  TestValidator.equals(
    "second category code matches",
    secondCategory.code,
    categoryCode2,
  );
  TestValidator.equals(
    "third category code matches",
    thirdCategory.code,
    categoryCode3,
  );
  TestValidator.equals(
    "fourth category code matches",
    fourthCategory.code,
    categoryCode4,
  );

  // Step 8: Validate display orders
  TestValidator.equals(
    "first category display order",
    firstCategory.display_order,
    1,
  );
  TestValidator.equals(
    "second category display order",
    secondCategory.display_order,
    2,
  );
  TestValidator.equals(
    "third category display order",
    thirdCategory.display_order,
    2,
  );
  TestValidator.equals(
    "fourth category display order",
    fourthCategory.display_order,
    999,
  );

  // Step 9: Validate active/inactive states
  TestValidator.equals(
    "first category is active",
    firstCategory.is_active,
    true,
  );
  TestValidator.equals(
    "second category is active",
    secondCategory.is_active,
    true,
  );
  TestValidator.equals(
    "third category is inactive",
    thirdCategory.is_active,
    false,
  );
  TestValidator.equals(
    "fourth category is active",
    fourthCategory.is_active,
    true,
  );

  // Step 10: Validate descriptions
  TestValidator.equals(
    "first category has description",
    firstCategory.description !== null,
    true,
  );
  TestValidator.equals(
    "second category has description",
    secondCategory.description !== null,
    true,
  );
  TestValidator.equals(
    "third category has no description",
    thirdCategory.description,
    null,
  );
  TestValidator.equals(
    "fourth category has no description",
    fourthCategory.description,
    null,
  );

  // Step 11: Validate default field values
  TestValidator.equals(
    "all categories have 0 article count initially",
    [firstCategory, secondCategory, thirdCategory, fourthCategory].every(
      (cat) => cat.article_count === 0,
    ),
    true,
  );

  // Step 12: Validate timestamp fields are present
  TestValidator.predicate("first category has created_at timestamp", () => {
    return firstCategory.created_at.length > 0;
  });
  TestValidator.predicate("first category has updated_at timestamp", () => {
    return firstCategory.updated_at.length > 0;
  });

  // Step 13: Test category with max length name
  const longNameCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(5),
          name: RandomGenerator.alphabets(100), // Near max length name
          display_order: 5,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(longNameCategory);

  TestValidator.equals(
    "long name category name length",
    longNameCategory.name.length,
    100,
  );
}
