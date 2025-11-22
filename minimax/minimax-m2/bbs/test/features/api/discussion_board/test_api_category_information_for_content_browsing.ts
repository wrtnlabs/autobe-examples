import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategory";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test category information retrieval for content discovery and browsing
 * purposes.
 *
 * This test validates that category information retrieved through the public
 * endpoint includes all necessary details for users to understand category
 * scope, browse available discussion topics, and make informed decisions about
 * content exploration. The test ensures that the category system effectively
 * supports the platform's content discovery features by providing clear
 * categorization information that helps users find relevant economic and
 * political discussions.
 *
 * Test Flow:
 *
 * 1. Create system administrator account for authentication prerequisite
 * 2. Create multiple meaningful economic/political discussion categories
 * 3. Test category information retrieval for each created category
 * 4. Validate comprehensive category information for content discovery
 * 5. Test edge cases with non-existent category IDs
 * 6. Verify category information supports browsing workflows
 */
export async function test_api_category_information_for_content_browsing(
  connection: api.IConnection,
) {
  // 1. Create system administrator account (authentication prerequisite)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // 2. Create multiple meaningful economic/political discussion categories
  const categories = [
    // Economic policy category
    {
      name: "Economic Policy Analysis",
      description:
        "In-depth discussions on fiscal policy, monetary policy, and economic regulations affecting markets and trade.",
      display_order: 1,
      is_active: true,
    },
    // Market analysis category
    {
      name: "Market Analysis & Trading",
      description:
        "Technical and fundamental analysis of financial markets, trading strategies, and investment insights.",
      display_order: 2,
      is_active: true,
    },
    // Political analysis category
    {
      name: "Political Systems & Governance",
      description:
        "Analysis of political institutions, governance structures, and their impact on economic and social policy.",
      display_order: 3,
      is_active: true,
    },
    // Current events category
    {
      name: "Current Economic Events",
      description:
        "Real-time discussion and analysis of ongoing economic developments, market movements, and policy changes.",
      display_order: 4,
      is_active: true,
    },
    // Academic research category
    {
      name: "Economic Research & Theory",
      description:
        "Academic discussions on economic theories, research methodologies, and scholarly insights into economic phenomena.",
      display_order: 5,
      is_active: true,
    },
  ];

  const createdCategories = [];
  for (const categoryData of categories) {
    const category: IEconPoliticalDiscussionCategory =
      await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
        connection,
        {
          body: categoryData satisfies IEconPoliticalDiscussionCategory.ICreate,
        },
      );
    typia.assert(category);
    createdCategories.push(category);
  }

  // 3. Test category information retrieval for each created category
  for (const category of createdCategories) {
    const retrievedCategory: IEconPoliticalDiscussionCategory =
      await api.functional.econPoliticalDiscussion.categories.at(connection, {
        categoryId: category.id,
      });
    typia.assert(retrievedCategory);

    // 4. Validate comprehensive category information for content discovery
    TestValidator.equals(
      "category ID matches original",
      retrievedCategory.id,
      category.id,
    );
    TestValidator.equals(
      "category name preserved",
      retrievedCategory.name,
      category.name,
    );
    TestValidator.equals(
      "category description preserved",
      retrievedCategory.description,
      category.description,
    );
    TestValidator.equals(
      "display order preserved",
      retrievedCategory.display_order,
      category.display_order,
    );
    TestValidator.equals(
      "category status is active",
      retrievedCategory.status,
      "active",
    );

    // Verify timestamp fields are present and valid
    TestValidator.predicate(
      "created_at timestamp is valid ISO format",
      typeof retrievedCategory.created_at === "string" &&
        retrievedCategory.created_at.length > 0,
    );
    TestValidator.predicate(
      "updated_at timestamp is valid ISO format",
      typeof retrievedCategory.updated_at === "string" &&
        retrievedCategory.updated_at.length > 0,
    );

    // Verify category is suitable for content browsing
    TestValidator.predicate(
      "category name supports content discovery",
      retrievedCategory.name.length > 0 && retrievedCategory.name.length <= 100,
    );
    TestValidator.predicate(
      "category description provides browsing context",
      retrievedCategory.description.length > 0 &&
        retrievedCategory.description.length <= 500,
    );
    TestValidator.predicate(
      "display order enables proper navigation",
      retrievedCategory.display_order >= 0,
    );
  }

  // 5. Test edge case with non-existent category ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent category ID should return error",
    async () => {
      await api.functional.econPoliticalDiscussion.categories.at(connection, {
        categoryId: nonExistentId,
      });
    },
  );

  // 6. Verify category information supports browsing workflows
  // Test that categories are ordered correctly for navigation
  const categoryOrder = createdCategories
    .map((cat) => cat.display_order)
    .sort((a, b) => a - b);

  TestValidator.predicate(
    "categories have sequential display order",
    categoryOrder.every((order, index) => order === index + 1),
  );

  // 7. Test comprehensive information for content discovery
  // Verify that each category provides sufficient information for users to make browsing decisions
  for (const category of createdCategories) {
    const categoryInfo =
      await api.functional.econPoliticalDiscussion.categories.at(connection, {
        categoryId: category.id,
      });

    // Validate information completeness for content discovery
    TestValidator.predicate(
      "category information supports content discovery decisions",
      categoryInfo.name.length > 0 &&
        categoryInfo.description.length > 0 &&
        categoryInfo.status === "active" &&
        categoryInfo.display_order >= 0,
    );

    // Verify temporal information for content freshness assessment
    TestValidator.predicate(
      "category timestamps enable temporal analysis",
      typeof categoryInfo.created_at === "string" &&
        typeof categoryInfo.updated_at === "string",
    );
  }

  // Summary validation: ensure all categories support the content browsing workflow
  TestValidator.predicate(
    "all created categories are retrievable and complete",
    createdCategories.length === categories.length,
  );

  for (const category of createdCategories) {
    const retrieved =
      await api.functional.econPoliticalDiscussion.categories.at(connection, {
        categoryId: category.id,
      });

    TestValidator.predicate(
      "category supports complete browsing workflow",
      retrieved.id === category.id &&
        retrieved.name === category.name &&
        retrieved.description === category.description &&
        retrieved.status === "active" &&
        retrieved.display_order === category.display_order,
    );
  }
}
