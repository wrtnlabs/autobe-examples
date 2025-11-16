import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test creation of inactive categories that are hidden from user interfaces but
 * preserved for administrative organization. Verify that inactive categories
 * are properly stored with is_active=false while maintaining referential
 * integrity for existing content organization.
 *
 * 1. Register new moderator account for authentication
 * 2. Create an inactive category with is_active=false
 * 3. Verify the category is created with correct properties
 * 4. Test creating multiple categories with different active states
 * 5. Ensure proper response format and data validation
 */
export async function test_api_moderator_category_create_inactive(
  connection: api.IConnection,
) {
  // Create moderator account first for authentication
  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(12),
        moderation_level: "test_moderator",
        email_verified: true,
        two_factor_enabled: false,
      } satisfies IEconomicDiscussionModerator.ICreate,
    });
  typia.assert(moderator);

  // Create inactive category
  const inactiveCategoryData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
    is_active: false,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const inactiveCategory: IEconomicDiscussionCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: inactiveCategoryData,
      },
    );
  typia.assert(inactiveCategory);

  // Verify category properties
  TestValidator.equals(
    "inactive category is_active should be false",
    inactiveCategory.is_active,
    false,
  );
  TestValidator.equals(
    "inactive category code matches",
    inactiveCategory.code,
    inactiveCategoryData.code,
  );
  TestValidator.equals(
    "inactive category name matches",
    inactiveCategory.name,
    inactiveCategoryData.name,
  );
  TestValidator.equals(
    "inactive category description matches",
    inactiveCategory.description,
    inactiveCategoryData.description,
  );
  TestValidator.equals(
    "inactive category display_order matches",
    inactiveCategory.display_order,
    inactiveCategoryData.display_order,
  );
  TestValidator.predicate(
    "inactive category id should be valid UUID",
    typia.is<string & tags.Format<"uuid">>(inactiveCategory.id),
  );
  TestValidator.predicate(
    "inactive category article_count should be 0 initially",
    inactiveCategory.article_count === 0,
  );

  // Create active category for comparison
  const activeCategoryData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 2,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const activeCategory: IEconomicDiscussionCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: activeCategoryData,
      },
    );
  typia.assert(activeCategory);

  // Verify active category properties
  TestValidator.equals(
    "active category is_active should be true",
    activeCategory.is_active,
    true,
  );
  TestValidator.equals(
    "active category code matches",
    activeCategory.code,
    activeCategoryData.code,
  );
  TestValidator.equals(
    "active category name matches",
    activeCategory.name,
    activeCategoryData.name,
  );
  TestValidator.predicate(
    "active category timestamps should be defined",
    inactiveCategory.created_at !== null &&
      inactiveCategory.updated_at !== null &&
      activeCategory.created_at !== null &&
      activeCategory.updated_at !== null,
  );
  TestValidator.equals(
    "categories should have different codes",
    inactiveCategory.code !== activeCategory.code,
    true,
  );
  TestValidator.equals(
    "categories should have different ids",
    inactiveCategory.id !== activeCategory.id,
    true,
  );

  // Test without description field (optional)
  const categoryWithoutDescription = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    display_order: 3,
    is_active: false,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const categoryNoDesc: IEconomicDiscussionCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryWithoutDescription,
      },
    );
  typia.assert(categoryNoDesc);

  TestValidator.equals(
    "category without description is_active should be false",
    categoryNoDesc.is_active,
    false,
  );
  TestValidator.equals(
    "category without description description should be undefined",
    categoryNoDesc.description,
    undefined,
  );
  TestValidator.predicate(
    "category without description should still have valid times",
    categoryNoDesc.created_at !== null && categoryNoDesc.updated_at !== null,
  );
}
