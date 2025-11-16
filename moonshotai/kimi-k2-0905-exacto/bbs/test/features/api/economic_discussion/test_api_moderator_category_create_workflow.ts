import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test complete moderator category creation workflow for economic discussion
 * platform
 *
 * This comprehensive test validates the entire category management lifecycle:
 *
 * 1. Moderator account creation and authentication setup
 * 2. Multiple category creation with different configurations
 * 3. Code format validation and uniqueness constraints
 * 4. Display ordering functionality for navigation hierarchy
 * 5. Active/inactive status management
 * 6. Business rule validation and system integration
 *
 * The test ensures the category taxonomy system functions correctly for
 * organizing economic and political discussion content across the platform.
 */
export async function test_api_moderator_category_create_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for administrative privileges
  const moderatorData = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    moderation_level: "senior",
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Validate moderator authentication completed successfully
  TestValidator.equals(
    "moderator authenticated successfully",
    typeof moderator.id === "string" && moderator.id.length > 0,
    true,
  );
  TestValidator.equals(
    "moderator username matches input",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorData.email,
  );

  // Step 2: Create primary economics category
  const economicsCategoryData = {
    code: `econ-${RandomGenerator.alphabets(6)}`,
    name: "Macroeconomic Policy & Analysis",
    description:
      "Comprehensive discussions on fiscal policy, monetary policy, and macroeconomic indicators affecting global and national economies",
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const economicsCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: economicsCategoryData,
      },
    );
  typia.assert(economicsCategory);

  // Validate primary category creation
  TestValidator.equals(
    "economics category ID format valid",
    typia.is<string & tags.Format<"uuid">>(economicsCategory.id),
    true,
  );
  TestValidator.equals(
    "economics category code matches input",
    economicsCategory.code,
    economicsCategoryData.code,
  );
  TestValidator.equals(
    "economics category name matches input",
    economicsCategory.name,
    economicsCategoryData.name,
  );
  TestValidator.equals(
    "economics description matches",
    economicsCategory.description,
    economicsCategoryData.description,
  );
  TestValidator.equals(
    "economics display order correct",
    economicsCategory.display_order,
    1,
  );
  TestValidator.equals(
    "economics category active",
    economicsCategory.is_active,
    true,
  );
  TestValidator.equals(
    "economics article count initialized",
    economicsCategory.article_count,
    0,
  );

  // Step 3: Create politics category with different configuration
  const politicsCategoryData = {
    code: `politics-${RandomGenerator.alphabets(8)}`,
    name: "Political Economy & Governance",
    description:
      "Analysis of political institutions, governance structures, and their economic impacts on society and markets",
    display_order: 2,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const politicsCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: politicsCategoryData,
      },
    );
  typia.assert(politicsCategory);

  // Validate politics category uniqueness
  TestValidator.notEquals(
    "politics category different ID",
    politicsCategory.id,
    economicsCategory.id,
  );
  TestValidator.notEquals(
    "politics category different code",
    politicsCategory.code,
    economicsCategory.code,
  );
  TestValidator.equals(
    "politics category name matches",
    politicsCategory.name,
    politicsCategoryData.name,
  );
  TestValidator.equals(
    "politics display order correct",
    politicsCategory.display_order,
    2,
  );

  // Step 4: Create inactive category for testing status management
  const inactiveCategoryData = {
    code: `inactive-${RandomGenerator.alphabets(10)}`,
    name: "Historical Economic Analysis",
    description: null,
    display_order: 99,
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

  // Validate inactive category properties
  TestValidator.equals(
    "inactive category has null description",
    inactiveCategory.description,
    null,
  );
  TestValidator.equals(
    "inactive category is not active",
    inactiveCategory.is_active,
    false,
  );
  TestValidator.equals(
    "inactive category high display order",
    inactiveCategory.display_order,
    99,
  );
  TestValidator.equals(
    "inactive category has zero articles",
    inactiveCategory.article_count,
    0,
  );

  // Step 5: Validate system metadata and timestamps
  const allCategories = [economicsCategory, politicsCategory, inactiveCategory];

  TestValidator.predicate(
    "all categories have valid created_at timestamps",
    () =>
      allCategories.every((cat) =>
        typia.is<string & tags.Format<"date-time">>(cat.created_at),
      ),
  );

  TestValidator.predicate(
    "all categories have valid updated_at timestamps",
    () =>
      allCategories.every((cat) =>
        typia.is<string & tags.Format<"date-time">>(cat.updated_at),
      ),
  );

  // Step 6: Validate business rule compliance
  TestValidator.predicate(
    "all category codes are unique",
    () => new Set(allCategories.map((cat) => cat.code)).size === 3,
  );

  TestValidator.predicate("all category codes meet length requirements", () =>
    allCategories.every((cat) => cat.code.length >= 1 && cat.code.length <= 50),
  );

  TestValidator.predicate("all category names meet length requirements", () =>
    allCategories.every(
      (cat) => cat.name.length >= 1 && cat.name.length <= 100,
    ),
  );

  TestValidator.predicate("display orders are properly set", () =>
    allCategories.every((cat) =>
      typia.is<number & tags.Type<"int32"> & tags.Minimum<0>>(
        cat.display_order,
      ),
    ),
  );

  // Step 7: Validate navigation and user experience features
  TestValidator.predicate("active categories are properly marked", () =>
    [economicsCategory, politicsCategory].every(
      (cat) => cat.is_active === true,
    ),
  );

  TestValidator.predicate(
    "inactive categories are properly marked",
    () => inactiveCategory.is_active === false,
  );

  // Validate that categories are ready for article association
  TestValidator.predicate("all categories ready for content organization", () =>
    allCategories.every(
      (cat) => cat.article_count === 0 && typeof cat.id === "string",
    ),
  );
}
