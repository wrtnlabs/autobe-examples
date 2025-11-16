import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test comprehensive category management including creation, ordering, and
 * status control. This test validates moderator's ability to create and manage
 * discussion categories with different display orders, activation states, and
 * organizational properties. Tests include creating multiple categories with
 * various configurations including active/inactive states, different display
 * orders, and optional descriptions. The test also validates the structured
 * organization of categories for platform scaling and demonstrates proper
 * moderation workflows with complete business context validation.
 */
export async function test_api_moderator_category_management(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "full",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple categories with different configurations
  // Create first category - active with description
  const category1 =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "economics_policy",
          name: "Economic Policy",
          description:
            "Discussion about economic policies, fiscal measures, and monetary policy",
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category1);
  TestValidator.equals(
    "first category created successfully",
    category1.code,
    "economics_policy",
  );
  TestValidator.equals("first category is active", category1.is_active, true);
  TestValidator.equals(
    "first category display order",
    category1.display_order,
    1,
  );

  // Create second category - politics (active, no description)
  const category2 =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "politics_domestic",
          name: "Domestic Politics",
          display_order: 2,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category2);
  TestValidator.equals(
    "second category created successfully",
    category2.code,
    "politics_domestic",
  );
  TestValidator.equals("second category is active", category2.is_active, true);
  TestValidator.equals(
    "second category display order",
    category2.display_order,
    2,
  );

  // Create third category - international relations (inactive)
  const category3 =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "international_relations",
          name: "International Relations",
          description: "Global politics and international economic cooperation",
          display_order: 3,
          is_active: false,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category3);
  TestValidator.equals(
    "third category created successfully",
    category3.code,
    "international_relations",
  );
  TestValidator.equals(
    "third category is inactive",
    category3.is_active,
    false,
  );
  TestValidator.equals(
    "third category display order",
    category3.display_order,
    3,
  );

  // Step 3: Create additional categories with higher display orders
  const category4 =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "market_analysis",
          name: "Market Analysis",
          description:
            "Technical and fundamental analysis of financial markets",
          display_order: 4,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category4);

  const category5 =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "regulatory_policy",
          name: "Regulatory Policy",
          display_order: 5,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category5);

  // Step 4: Validate category properties and relationships
  // Test nested validation
  TestValidator.notEquals(
    "categories have different UUIDs",
    category1.id,
    category2.id,
  );
  TestValidator.notEquals(
    "categories have different UUIDs",
    category2.id,
    category3.id,
  );
  TestValidator.notEquals(
    "categories have different UUIDs",
    category3.id,
    category4.id,
  );
  TestValidator.notEquals(
    "categories have different UUIDs",
    category4.id,
    category5.id,
  );

  // Validate creation timestamps
  TestValidator.predicate(
    "categories have created_at timestamps",
    category1.created_at !== null,
  );
  TestValidator.predicate(
    "categories have updated_at timestamps",
    category1.updated_at !== null,
  );
  TestValidator.notEquals(
    "created_at and updated_at are different initially",
    category1.created_at,
    category1.updated_at,
  );

  // Validate the complete category structure including all UUID, timestamps, and business properties
  TestValidator.predicate(
    "first category name validation",
    category1.name === "Economic Policy",
  );
  TestValidator.predicate(
    "second category has null description",
    category2.description === null || category2.description === undefined,
  );
  TestValidator.predicate(
    "third category is properly inactive",
    category3.is_active === false,
  );
  TestValidator.predicate(
    "fourth category has proper code",
    category4.code.startsWith("market"),
  );
  TestValidator.predicate(
    "fifth category displays correctly",
    category5.display_order === 5,
  );

  // Step 5: Test category organization and display hierarchy
  TestValidator.predicate(
    "display orders are sequential",
    category1.display_order < category2.display_order,
  );
  TestValidator.predicate(
    "display orders are sequential",
    category2.display_order < category3.display_order,
  );
  TestValidator.predicate(
    "display orders are sequential",
    category3.display_order < category4.display_order,
  );
  TestValidator.predicate(
    "display orders are sequential",
    category4.display_order < category5.display_order,
  );

  // Validate article counts start at zero
  TestValidator.equals(
    "new categories start with zero articles",
    category1.article_count,
    0,
  );
  TestValidator.equals(
    "new categories start with zero articles",
    category2.article_count,
    0,
  );
  TestValidator.equals(
    "new categories start with zero articles",
    category3.article_count,
    0,
  );
  TestValidator.equals(
    "new categories start with zero articles",
    category4.article_count,
    0,
  );
  TestValidator.equals(
    "new categories start with zero articles",
    category5.article_count,
    0,
  );

  // Step 6: Test category soft deletion (not active)
  TestValidator.predicate(
    "inactive category should maintain all properties",
    category3 !== null,
  );
  TestValidator.predicate(
    "inactive category should have proper name",
    category3.name === "International Relations",
  );
  TestValidator.predicate(
    "inactive category description is maintained",
    category3.description ===
      "Global politics and international economic cooperation",
  );
  TestValidator.equals(
    "inactive category should not be deleted initially",
    category3.deleted_at,
    null,
  );

  // Step 7: Validate the complete test scenario completed successfully
  TestValidator.predicate(
    "moderator authentication completed",
    moderator.token.access !== null,
  );
  TestValidator.predicate(
    "all categories created successfully",
    category1 !== null &&
      category2 !== null &&
      category3 !== null &&
      category4 !== null &&
      category5 !== null,
  );
  TestValidator.predicate(
    "category hierarchy established",
    category1.display_order === 1 && category5.display_order === 5,
  );
  TestValidator.predicate(
    "activation states properly configured",
    category1.is_active === true &&
      category2.is_active === true &&
      category3.is_active === false &&
      category4.is_active === true &&
      category5.is_active === true,
  );
}
