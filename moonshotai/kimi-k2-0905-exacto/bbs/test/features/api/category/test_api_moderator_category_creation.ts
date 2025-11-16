import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test moderator category creation for organizing economic and political
 * discussion topics.
 *
 * This test validates that moderators can create new discussion categories with
 * proper metadata including unique codes, display names, descriptions, and
 * ordering. Ensures that categories are created with appropriate article
 * counts, activation status, and proper indexing for content discoverability
 * and navigation efficiency within the discussion platform.
 *
 * 1. First, register a new moderator account to establish authentication
 * 2. Create a new discussion category with all required fields
 * 3. Validate the response contains all expected category metadata
 * 4. Test category creation with optional description field
 * 5. Test category creation with different activation states
 * 6. Verify categories are returned with proper ordering and article counts
 */
export async function test_api_moderator_category_creation(
  connection: api.IConnection,
) {
  // Register a new moderator account for authentication
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    moderation_level: "senior",
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Test creating a basic economic discussion category
  const basicCategoryData = {
    code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: 10,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const basicCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: basicCategoryData,
      },
    );
  typia.assert(basicCategory);

  // Validate the created category has all expected properties
  TestValidator.equals(
    "category code matches",
    basicCategory.code,
    basicCategoryData.code,
  );
  TestValidator.equals(
    "category name matches",
    basicCategory.name,
    basicCategoryData.name,
  );
  TestValidator.equals(
    "category description matches",
    basicCategory.description,
    basicCategoryData.description,
  );
  TestValidator.equals(
    "display order matches",
    basicCategory.display_order,
    basicCategoryData.display_order,
  );
  TestValidator.equals(
    "active status matches",
    basicCategory.is_active,
    basicCategoryData.is_active,
  );
  TestValidator.predicate(
    "article count starts at 0",
    basicCategory.article_count === 0,
  );
  TestValidator.predicate(
    "category has valid UUID",
    typia.is<string & tags.Format<"uuid">>(basicCategory.id),
  );
  TestValidator.predicate(
    "has creation timestamp",
    typia.is<string & tags.Format<"date-time">>(basicCategory.created_at),
  );
  TestValidator.predicate(
    "has update timestamp",
    typia.is<string & tags.Format<"date-time">>(basicCategory.updated_at),
  );

  // Test creating a category without description
  const minimalCategoryData = {
    code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    name: RandomGenerator.name(1),
    display_order: 20,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const minimalCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: minimalCategoryData,
      },
    );
  typia.assert(minimalCategory);

  TestValidator.equals(
    "minimal category code",
    minimalCategory.code,
    minimalCategoryData.code,
  );
  TestValidator.equals(
    "minimal category name",
    minimalCategory.name,
    minimalCategoryData.name,
  );
  TestValidator.equals(
    "minimal category description",
    minimalCategory.description,
    undefined,
  );
  TestValidator.equals(
    "minimal display order",
    minimalCategory.display_order,
    minimalCategoryData.display_order,
  );
  TestValidator.predicate(
    "minimal category is active",
    minimalCategory.is_active === true,
  );

  // Test creating an inactive category
  const inactiveCategoryData = {
    code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 30,
    is_active: false,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const inactiveCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: inactiveCategoryData,
      },
    );
  typia.assert(inactiveCategory);

  TestValidator.equals(
    "inactive category code",
    inactiveCategory.code,
    inactiveCategoryData.code,
  );
  TestValidator.equals(
    "inactive category name",
    inactiveCategory.name,
    inactiveCategoryData.name,
  );
  TestValidator.equals(
    "inactive category status",
    inactiveCategory.is_active,
    false,
  );
  TestValidator.predicate(
    "inactive category has description",
    inactiveCategory.description !== null,
  );

  // Test creating category with different display orders
  const highPriorityCategoryData = {
    code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    name: RandomGenerator.name(2),
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const highPriorityCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: highPriorityCategoryData,
      },
    );
  typia.assert(highPriorityCategory);

  TestValidator.equals(
    "high priority display order",
    highPriorityCategory.display_order,
    1,
  );

  // Validate unique code constraint by attempting duplicate
  const duplicateCodeData = {
    code: basicCategory.code.toUpperCase(),
    name: RandomGenerator.name(1),
    display_order: 40,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  await TestValidator.error("duplicate category code should fail", async () => {
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: duplicateCodeData,
      },
    );
  });
}
