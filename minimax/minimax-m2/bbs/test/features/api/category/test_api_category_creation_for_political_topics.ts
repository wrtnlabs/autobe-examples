import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategory";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_category_creation_for_political_topics(
  connection: api.IConnection,
) {
  // Step 1: Create system administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(adminAccount);

  // Step 2: Create political discussion categories with appropriate terminology
  const politicalCategories = [
    {
      name: "Political Analysis",
      description:
        "In-depth analysis of political events, trends, and developments. This category focuses on critical examination of political processes, policy impacts, and systemic changes in government and political institutions.",
      display_order: 1,
      is_active: true,
    },
    {
      name: "Legislative Updates",
      description:
        "Discussion and analysis of new laws, policy changes, and legislative developments. Users can share insights on proposed bills, enacted legislation, and their implications for citizens and society.",
      display_order: 2,
      is_active: true,
    },
    {
      name: "Government Policy",
      description:
        "Examination and discussion of government initiatives, programs, and policy implementations. This category covers federal, state, and local policy discussions with focus on effectiveness and societal impact.",
      display_order: 3,
      is_active: true,
    },
    {
      name: "Electoral Politics",
      description:
        "Coverage and analysis of elections, campaigns, voting patterns, and democratic processes. This category includes election results analysis, campaign strategy discussions, and voter behavior studies.",
      display_order: 4,
      is_active: true,
    },
    {
      name: "International Relations",
      description:
        "Discussion of foreign policy, diplomacy, international agreements, and global political dynamics. Topics include trade relations, security alliances, and international cooperation initiatives.",
      display_order: 5,
      is_active: true,
    },
  ];

  // Step 3: Create each political category and validate responses
  const createdCategories: IEconPoliticalDiscussionCategory[] = [];

  for (const categoryData of politicalCategories) {
    const createdCategory: IEconPoliticalDiscussionCategory =
      await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
        connection,
        {
          body: categoryData satisfies IEconPoliticalDiscussionCategory.ICreate,
        },
      );
    typia.assert(createdCategory);

    // Validate category structure and political terminology
    TestValidator.equals(
      "category has valid UUID",
      typeof createdCategory.id,
      "string",
    );
    TestValidator.equals(
      "category name matches input",
      createdCategory.name,
      categoryData.name,
    );
    TestValidator.equals(
      "category description matches input",
      createdCategory.description,
      categoryData.description,
    );
    TestValidator.equals(
      "display order preserved",
      createdCategory.display_order,
      categoryData.display_order,
    );
    TestValidator.equals(
      "category status is active",
      createdCategory.status,
      "active",
    );
    TestValidator.equals(
      "creation timestamp present",
      createdCategory.created_at !== null &&
        createdCategory.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "update timestamp present",
      createdCategory.updated_at !== null &&
        createdCategory.updated_at !== undefined,
      true,
    );

    // Validate that political terminology is properly preserved
    TestValidator.predicate(
      "political category name contains meaningful terminology",
      createdCategory.name.toLowerCase().includes("political") ||
        createdCategory.name.toLowerCase().includes("legislative") ||
        createdCategory.name.toLowerCase().includes("government") ||
        createdCategory.name.toLowerCase().includes("electoral") ||
        createdCategory.name.toLowerCase().includes("international"),
    );

    // Validate description provides meaningful scope guidance
    TestValidator.predicate(
      "political category has descriptive scope",
      createdCategory.description.length > 50 &&
        (createdCategory.description.toLowerCase().includes("discussion") ||
          createdCategory.description.toLowerCase().includes("analysis") ||
          createdCategory.description.toLowerCase().includes("policy") ||
          createdCategory.description.toLowerCase().includes("government")),
    );

    createdCategories.push(createdCategory);
  }

  // Step 4: Validate category organization structure
  TestValidator.equals(
    "all categories created successfully",
    createdCategories.length,
    politicalCategories.length,
  );

  // Verify categories are ordered correctly for political discourse organization
  const sortedCategories = [...createdCategories].sort(
    (a, b) => a.display_order - b.display_order,
  );
  TestValidator.equals(
    "categories maintain display order",
    sortedCategories.map((c) => c.display_order),
    [1, 2, 3, 4, 5],
  );

  // Step 5: Validate business logic for political discourse support
  const categoryNames = createdCategories.map((c) => c.name.toLowerCase());

  // Verify categories cover key political topic areas
  TestValidator.predicate(
    "political analysis category exists",
    categoryNames.includes("political analysis"),
  );
  TestValidator.predicate(
    "legislative updates category exists",
    categoryNames.includes("legislative updates"),
  );
  TestValidator.predicate(
    "government policy category exists",
    categoryNames.includes("government policy"),
  );
  TestValidator.predicate(
    "electoral politics category exists",
    categoryNames.includes("electoral politics"),
  );
  TestValidator.predicate(
    "international relations category exists",
    categoryNames.includes("international relations"),
  );

  // Step 6: Validate descriptions support productive political discourse
  const allDescriptions = createdCategories.map((c) =>
    c.description.toLowerCase(),
  );

  TestValidator.predicate(
    "descriptions promote meaningful discourse",
    allDescriptions.every(
      (desc) =>
        desc.includes("discussion") ||
        desc.includes("analysis") ||
        desc.includes("examination") ||
        desc.includes("coverage"),
    ),
  );

  TestValidator.predicate(
    "descriptions provide scope guidance",
    allDescriptions.every((desc) => desc.length > 80),
  );

  // Step 7: Validate timestamps and data integrity
  for (const category of createdCategories) {
    TestValidator.predicate(
      "category has valid creation timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(category.created_at),
    );
    TestValidator.predicate(
      "category has valid update timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(category.updated_at),
    );
    TestValidator.predicate(
      "category has no deletion timestamp",
      category.deleted_at === null || category.deleted_at === undefined,
    );
  }
}
