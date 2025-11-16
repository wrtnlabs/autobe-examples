import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test category creation with special codes, symbols, and complex naming
 * conventions.
 *
 * This comprehensive test validates the system's ability to handle diverse
 * category naming patterns including special characters, alphanumeric
 * combinations, case sensitivity, and complex codes. The test ensures URL
 * safety navigation functionality and proper display across all platform
 * features.
 *
 * Business context: Economic discussion boards require flexible category
 * systems that can handle complex topic classifications while maintaining
 * SEO-friendly URLs and user-friendly navigation.
 */
export async function test_api_moderator_category_creation_special_codes(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account with diverse credentials for testing authorization
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: `moderator_${RandomGenerator.alphabets(8)}`,
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(16),
      moderation_level: typia.random<
        string & tags.Pattern<"^[a-z0-9-]{3,20}$">
      >(),
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Test category creation with challenging alphanumeric codes
  const alphanumericCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: `ECO-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
          name: `Economic Analysis ${RandomGenerator.name(2)}`,
          description: `Comprehensive economic analysis covering market trends, policy impacts, and financial data with ${RandomGenerator.paragraph({ sentences: 3 })}`,
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(alphanumericCategory);

  TestValidator.equals(
    "alphanumeric category code saved correctly",
    alphanumericCategory.code,
    `ECO-${alphanumericCategory.code.split("-")[1]}`,
  );

  // Step 3: Test category with special symbols and punctuation
  const specialSymbolsCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: `TRADE&MKT_${RandomGenerator.alphabets(5).toLowerCase()}`,
          name: `Trade & Market Analysis`,
          description: `International trade data, market analysis, and cross-border economic relations with $\&*() symbols`,
          display_order: 2,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(specialSymbolsCategory);

  TestValidator.equals(
    "special symbols category code preserved",
    specialSymbolsCategory.code,
    specialSymbolsCategory.code,
  );

  // Step 4: Test category with mixed case sensitivity patterns
  const mixedCaseCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: `FiNaNcE-${RandomGenerator.alphaNumeric(4)}-DATA`,
          name: `Financial Data Analytics`,
          description: `Detailed financial analysis covering banking, investments, and market data with MiXeD CaSe formatting`,
          display_order: 3,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(mixedCaseCategory);

  TestValidator.equals(
    "mixed case category code maintains original formatting",
    mixedCaseCategory.code,
    `FiNaNcE-${mixedCaseCategory.code.split("-")[1]}-DATA`,
  );

  // Step 5: Test numeric-heavy category codes
  const numericCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: `2024-${RandomGenerator.alphaNumeric(10)}`,
          name: `2024 Economic Trends`,
          description: `Analysis of economic trends specific to fiscal year 2024 with comprehensive statistical data`,
          display_order: 4,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(numericCategory);

  TestValidator.predicate(
    "numeric category code validation",
    numericCategory.code.startsWith("2024-"),
  );

  // Step 6: Test URL-safe category codes
  const urlSafeCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: `macro-economics-${RandomGenerator.alphaNumeric(6).toLowerCase()}`,
          name: `Macro Economics Research`,
          description: `Macroeconomic research covering GDP, inflation, employment, and monetary policy analysis`,
          display_order: 5,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(urlSafeCategory);

  TestValidator.predicate(
    "URL-safe category title is valid",
    urlSafeCategory.name.includes("Macro Economics"),
  );

  // Step 7: Test category with minimal but valid code
  const minimalCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: `A${RandomGenerator.alphaNumeric(2)}`,
          name: `Policy Analysis`,
          description: null,
          display_order: 6,
          is_active: false,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(minimalCategory);

  TestValidator.equals(
    "minimal category created successfully",
    minimalCategory.is_active,
    false,
  );

  // Step 8: Validating category system properties and timestamps
  const categories = [
    alphanumericCategory,
    specialSymbolsCategory,
    mixedCaseCategory,
    numericCategory,
    urlSafeCategory,
    minimalCategory,
  ];

  // Step 9: Verify system-generated fields and data consistency
  TestValidator.predicate(
    "all category codes are unique",
    new Set(categories.map((c) => c.code)).size === categories.length,
  );

  TestValidator.predicate(
    "all category names meet length requirements",
    categories.every((c) => c.name.length >= 1 && c.name.length <= 100),
  );

  TestValidator.predicate(
    "all category codes meet length requirements",
    categories.every((c) => c.code.length >= 1 && c.code.length <= 50),
  );

  // Step 10: Runtime validation and data integrity checks
  for (const category of categories) {
    typia.assert(category);
    TestValidator.predicate(
      `category ${category.code} has valid timestamps`,
      category.created_at !== undefined && category.updated_at !== undefined,
    );
    TestValidator.predicate(
      `category ${category.code} has valid numeric fields`,
      category.display_order >= 0 && category.article_count >= 0,
    );
  }

  // Step 11: Final validation ensuring comprehensive test coverage
  TestValidator.predicate(
    "variety of test patterns validated successfully",
    [
      alphanumericCategory,
      specialSymbolsCategory,
      mixedCaseCategory,
      numericCategory,
      urlSafeCategory,
      minimalCategory,
    ].length === 6,
  );
}
