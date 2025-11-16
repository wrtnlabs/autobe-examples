import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test category creation with immediate deactivation or inactive status for
 * administrative flexibility.
 *
 * This scenario validates that moderators can create categories that aren't
 * immediately available for article assignment, allowing for content
 * organization planning and staged category rollouts. Tests proper handling of
 * inactive categories, preservation of historical references, and ensures that
 * category status management supports various administrative workflows.
 *
 * Test Steps:
 *
 * 1. Register a new moderator account
 * 2. Create an inactive category as the moderator
 * 3. Verify the inactive category properties match the request data
 * 4. Confirm is_active is false for the created category
 * 5. Test creating another category with is_active true (baseline)
 * 6. Validate proper timestamp generation and formatting
 * 7. Test category with empty description (null handling)
 *
 * The test demonstrates that categories can be created in inactive state for
 * administrative planning, ensuring proper content organization and staged
 * rollout capabilities for the discussion platform.
 */
export async function test_api_moderator_category_creation_deactivation(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorRequestBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    moderation_level: RandomGenerator.pick([
      "admin",
      "moderator",
      "reviewer",
    ] as const),
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorRequestBody,
  });
  typia.assert(moderator);

  // Step 2: Create an inactive category as the moderator
  const inactiveCategoryRequestBody = {
    code: RandomGenerator.alphabets(6).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    display_order: 1,
    is_active: false,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const inactiveCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      { body: inactiveCategoryRequestBody },
    );

  // Step 3: Verify the inactive category properties match the request data
  TestValidator.equals(
    "category code matches request",
    inactiveCategory.code,
    inactiveCategoryRequestBody.code,
  );
  TestValidator.equals(
    "category name matches request",
    inactiveCategory.name,
    inactiveCategoryRequestBody.name,
  );
  TestValidator.equals(
    "category description matches request",
    inactiveCategory.description,
    inactiveCategoryRequestBody.description,
  );
  TestValidator.equals(
    "display order matches request",
    inactiveCategory.display_order,
    inactiveCategoryRequestBody.display_order,
  );

  // Step 4: Confirm is_active is false for the created category
  TestValidator.equals(
    "category is inactive",
    inactiveCategory.is_active,
    false,
  );
  TestValidator.equals("article count is 0", inactiveCategory.article_count, 0);

  // Step 5: Create another category with is_active true (baseline comparison)
  const activeCategoryRequestBody = {
    code: RandomGenerator.alphabets(6).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 8,
    }),
    display_order: 2,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const activeCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      { body: activeCategoryRequestBody },
    );

  // Verify the active category has correct is_active status
  TestValidator.equals(
    "active category is active",
    activeCategory.is_active,
    true,
  );
  TestValidator.equals(
    "active category code matches request",
    activeCategory.code,
    activeCategoryRequestBody.code,
  );

  // Step 6: Validate types and formats
  typia.assert(inactiveCategory);
  typia.assert(activeCategory);

  // Validate proper timestamp generation
  TestValidator.predicate(
    "inactive category has valid created_at timestamp",
    typeof inactiveCategory.created_at === "string" &&
      inactiveCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "inactive category has valid updated_at timestamp",
    typeof inactiveCategory.updated_at === "string" &&
      inactiveCategory.updated_at.length > 0,
  );
  TestValidator.predicate(
    "active category has valid created_at timestamp",
    typeof activeCategory.created_at === "string" &&
      activeCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "active category has valid updated_at timestamp",
    typeof activeCategory.updated_at === "string" &&
      activeCategory.updated_at.length > 0,
  );

  // Step 7: Test category with empty description (null handling)
  const nullDescriptionCategoryRequestBody = {
    code: RandomGenerator.alphabets(6).toLowerCase(),
    name: RandomGenerator.name(2),
    description: null,
    display_order: 3,
    is_active: false,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const nullDescriptionCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      { body: nullDescriptionCategoryRequestBody },
    );

  TestValidator.equals(
    "category with null description has null description",
    nullDescriptionCategory.description,
    null,
  );
  TestValidator.equals(
    "category with null description is inactive",
    nullDescriptionCategory.is_active,
    false,
  );
  typia.assert(nullDescriptionCategory);
}
