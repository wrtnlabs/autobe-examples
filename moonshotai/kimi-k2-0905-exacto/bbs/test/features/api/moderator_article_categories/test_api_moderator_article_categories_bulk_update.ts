import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICategoryCode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICategoryCode";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test moderator ability to perform bulk category updates on multiple articles
 * efficiently.
 *
 * This test validates the moderator's capability to manage category assignments
 * across the platform for content organization and moderation compliance. The
 * comprehensive workflow includes:
 *
 * 1. Moderator account creation and authentication
 * 2. Testing bulk category updates with various scenarios
 * 3. Validating category assignment limits and constraints
 * 4. Testing proper error handling for invalid operations
 * 5. Verifying authentication requirements for moderator operations
 *
 * The test ensures moderators can efficiently organize content through category
 * management while maintaining proper access controls and data integrity for
 * the economic discussion platform.
 */
export async function test_api_moderator_article_categories_bulk_update(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category management
  const moderatorCreateData = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    moderation_level: "standard",
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(moderator);

  TestValidator.equals(
    "moderator created successfully",
    moderator.username,
    moderatorCreateData.username,
  );
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorCreateData.email,
  );
  TestValidator.predicate("moderator has valid id", () =>
    typia.is<string & tags.Format<"uuid">>(moderator.id),
  );

  // Step 2: Prepare test scenarios for bulk category updates
  const categories = [
    "economics",
    "politics",
    "finance",
    "policy",
    "international",
  ] as const;
  const testArticleIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Step 3: Test various category assignment scenarios
  const testScenarios = [
    {
      articleId: testArticleIds[0],
      categories: [
        RandomGenerator.pick(categories),
        RandomGenerator.pick(categories),
      ],
      description: "multiple categories",
    },
    {
      articleId: testArticleIds[1],
      categories: [categories[0], categories[2], categories[4]],
      description: "specific category combination",
    },
    {
      articleId: testArticleIds[2],
      categories: [],
      description: "empty categories",
    },
  ];

  // Execute bulk category updates for each scenario
  for (const scenario of testScenarios) {
    const response: IEconomicDiscussionArticle.ISummary =
      await api.functional.economicDiscussion.moderator.articles.categories.updateCategories(
        connection,
        {
          articleId: scenario.articleId,
          body: {
            category_codes: scenario.categories,
          } satisfies IEconomicDiscussionArticle.ICategoriesUpdate,
        },
      );

    typia.assert(response);
    TestValidator.equals(
      `article id matches for ${scenario.description}`,
      response.id,
      scenario.articleId,
    );
    TestValidator.equals(
      `categories count matches for ${scenario.description}`,
      response.categories.length,
      scenario.categories.length,
    );
  }

  // Step 4: Test category limits - maximum of 10 categories
  const maxCategories = ArrayUtil.repeat(10, () =>
    RandomGenerator.pick(categories),
  );
  const maxCategoryResponse =
    await api.functional.economicDiscussion.moderator.articles.categories.updateCategories(
      connection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          category_codes: maxCategories,
        } satisfies IEconomicDiscussionArticle.ICategoriesUpdate,
      },
    );

  typia.assert(maxCategoryResponse);
  TestValidator.equals(
    "max categories applied",
    maxCategoryResponse.categories.length,
    10,
  );
  TestValidator.predicate("all categories have valid structure", () =>
    maxCategoryResponse.categories.every((cat) =>
      typia.is<IEconomicDiscussionCategories.ISummary>(cat),
    ),
  );

  // Step 5: Test authentication requirements
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated moderator cannot update categories",
    async () => {
      await api.functional.economicDiscussion.moderator.articles.categories.updateCategories(
        unauthConnection,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            category_codes: [RandomGenerator.pick(categories)],
          } satisfies IEconomicDiscussionArticle.ICategoriesUpdate,
        },
      );
    },
  );
}
