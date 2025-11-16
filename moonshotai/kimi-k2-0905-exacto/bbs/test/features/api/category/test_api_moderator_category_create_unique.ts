import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test category code uniqueness validation for economic discussion platform.
 *
 * This test validates that the system properly enforces unique category codes
 * by attempting to create categories with duplicate codes. Category codes must
 * be unique across the platform for proper URL generation, API identification,
 * and content organization consistency.
 *
 * Test Workflow:
 *
 * 1. Register and authenticate as a moderator to gain administrative access
 * 2. Create an initial category with a specific code
 * 3. Attempt to create a second category with the same code
 * 4. Verify that duplicate code creation is properly rejected
 * 5. Confirm system maintains data integrity with unique codes
 *
 * Business Context:
 *
 * - Category codes are used in URLs and API endpoints
 * - Duplicate codes would break navigation and API functionality
 * - Unique codes ensure reliable category identification
 * - Moderator-only access maintains security for category management
 */
export async function test_api_moderator_category_create_unique(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and authenticate
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    moderation_level: "admin",
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create initial category with specific code
  const categoryCode = RandomGenerator.alphaNumeric(8);
  const firstCategoryData = {
    code: categoryCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const firstCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: firstCategoryData,
      },
    );
  typia.assert(firstCategory);

  // Verify first category was created successfully
  TestValidator.equals(
    "first category code matches",
    firstCategory.code,
    categoryCode,
  );
  TestValidator.equals(
    "first category name matches",
    firstCategory.name,
    firstCategoryData.name,
  );

  // Step 3: Attempt to create second category with duplicate code
  const duplicateCategoryData = {
    code: categoryCode, // Same code as first category
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 2,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  // Step 4: Verify duplicate code creation is rejected
  await TestValidator.error(
    "duplicate category code should be rejected",
    async () => {
      await api.functional.economicDiscussion.moderator.categories.create(
        connection,
        {
          body: duplicateCategoryData,
        },
      );
    },
  );

  // Step 5: Test with different but valid category code to ensure system still works
  const uniqueCategoryData = {
    code: RandomGenerator.alphaNumeric(8), // Different code
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 3,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const secondCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: uniqueCategoryData,
      },
    );
  typia.assert(secondCategory);

  // Verify second category with unique code was created successfully
  TestValidator.equals(
    "second category code matches",
    secondCategory.code,
    uniqueCategoryData.code,
  );
  TestValidator.notEquals(
    "categories have different codes",
    firstCategory.code,
    secondCategory.code,
  );
  TestValidator.predicate(
    "categories maintain unique codes",
    () => firstCategory.code !== secondCategory.code,
  );
}
