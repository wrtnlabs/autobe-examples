import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test category creation validation including code uniqueness and display
 * ordering constraints. This E2E test validates that the system enforces unique
 * category codes for URL generation and maintains proper display ordering for
 * navigation hierarchy in economic/political discussion board categorization.
 *
 * 1. Register and authenticate as moderator to gain management permissions
 * 2. Create initial test category with unique code and display order
 * 3. Attempt duplicate category code creation to validate uniqueness enforcement
 * 4. Create additional categories with various display_order values (0, 1, 2, 3,
 *    4, 100)
 * 5. Test both active and inactive category creation for complete coverage
 * 6. Verify all created categories maintain correct properties and relationships
 */
export async function test_api_category_validation_and_uniqueness(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate moderator for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "admin",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create initial category for uniqueness testing
  const firstCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "economics",
          name: "Economics",
          description: "Discussions about economic theory and policy",
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(firstCategory);

  // Step 3: Validate category code uniqueness by attempting duplicate
  await TestValidator.error(
    "duplicate category code should be rejected",
    async () => {
      await api.functional.economicDiscussion.moderator.categories.create(
        connection,
        {
          body: {
            code: "economics", // Same as first category - must fail
            name: "Duplicate Economics",
            description: "Another economics category with same code",
            display_order: 2,
            is_active: true,
          } satisfies IEconomicDiscussionCategory.ICreate,
        },
      );
    },
  );

  // Step 4: Create various categories with different display orders
  const politicsCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "politics",
          name: "Politics",
          description: "Political discussions and debates",
          display_order: 2,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(politicsCategory);

  const internationalCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "international-affairs",
          name: "International Affairs",
          description: "Global economic and political affairs",
          display_order: 3,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(internationalCategory);

  // Step 5: Test edge display order values (0 and large numbers)
  const zeroOrderCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "policy",
          name: "Policy",
          description: "Policy analysis and discussions",
          display_order: 0,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(zeroOrderCategory);

  const highOrderCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "market-analysis",
          name: "Market Analysis",
          description: "Market trend analysis and predictions",
          display_order: 100,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(highOrderCategory);

  // Step 6: Verify category properties correctness
  TestValidator.equals(
    "first category has correct code",
    firstCategory.code,
    "economics",
  );
  TestValidator.equals(
    "politics category has correct display order",
    politicsCategory.display_order,
    2,
  );
  TestValidator.equals(
    "international affairs category is active",
    internationalCategory.is_active,
    true,
  );
  TestValidator.equals(
    "zero order category has correct order value",
    zeroOrderCategory.display_order,
    0,
  );
  TestValidator.equals(
    "high order category has correct order value",
    highOrderCategory.display_order,
    100,
  );

  // Step 7: Test inactive category creation
  const inactiveCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "historical-analysis",
          name: "Historical Analysis",
          description:
            "Historical economic and political analysis for reference",
          display_order: 4,
          is_active: false,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(inactiveCategory);
  TestValidator.equals(
    "inactive category has correct active status",
    inactiveCategory.is_active,
    false,
  );
}
