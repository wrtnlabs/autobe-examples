import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionCategorySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategorySummary";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IEconomicDiscussionRecommendation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendation";
import type { IEconomicDiscussionRecommendationsList } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendationsList";
import type { IEconomicDiscussionRecommendationsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendationsRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test successful moderator discovery recommendations with comprehensive
 * validation.
 *
 * This test validates the complete recommendation flow for economic discussion
 * platform moderation. It establishes moderator authentication, creates test
 * categories and articles, then tests the personalized recommendation engine.
 *
 * Test validates:
 *
 * 1. Moderator authentication context setup
 * 2. Category creation for content organization
 * 3. Article creation with proper categorization
 * 4. Recommendation engine response format
 * 5. Pagination metadata accuracy
 * 6. Actual DTO properties from IEconomicDiscussionRecommendation
 *
 * The recommendation engine analyzes user behavior, interaction patterns, and
 * content preferences to generate personalized suggestions for economic and
 * political discussions.
 */
export async function test_api_moderator_recommendations_success_flow(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with proper authentication
  const moderatorData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    moderation_level: "standard",
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create economic discussion categories for content organization
  const categoryData1 = {
    code: RandomGenerator.alphabets(8),
    name: "Macroeconomic Policy",
    description: "Discussion of monetary and fiscal policy decisions",
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category1 =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      { body: categoryData1 },
    );
  typia.assert(category1);

  const categoryData2 = {
    code: RandomGenerator.alphabets(8),
    name: "International Trade",
    description: "Trade agreements and economic globalization topics",
    display_order: 2,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category2 =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      { body: categoryData2 },
    );
  typia.assert(category2);

  // Step 3: Create test articles with comprehensive content
  const articleData1 = {
    title: "Federal Reserve Interest Rate Policy Analysis",
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    category_ids: [category1.id, category2.id],
    attachments: [
      {
        filename: "economic_data.pdf",
        mime_type: "application/pdf",
        file_size: 1024 * 256, // 256KB
        file_type: "document",
      },
    ],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article1 =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      { body: articleData1 },
    );
  typia.assert(article1);

  const articleData2 = {
    title: "Global Supply Chain Disruptions Impact",
    content: RandomGenerator.content({
      paragraphs: 4,
      sentenceMin: 10,
      sentenceMax: 18,
    }),
    category_ids: [category2.id],
    attachments: [
      {
        filename: "supply_chain_analysis.xlsx",
        mime_type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        file_size: 1024 * 128, // 128KB
        file_type: "spreadsheet",
      },
    ],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article2 =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      { body: articleData2 },
    );
  typia.assert(article2);

  // Step 4: Test recommendation system with comprehensive parameters
  const requestData = {
    categoryIds: [category1.id, category2.id],
    searchKeywords: ["federal reserve", "trade policy", "economic analysis"],
    interactionHistory: [article1.id, article2.id],
    maxResults: 10,
    minRelevanceScore: 0.5,
  } satisfies IEconomicDiscussionRecommendationsRequest;

  const recommendations =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      { body: requestData },
    );
  typia.assert(recommendations);

  // Step 5: Validate recommendation response structure
  TestValidator.predicate(
    "recommendations contains data array",
    Array.isArray(recommendations.data) && recommendations.data.length >= 0,
  );

  TestValidator.predicate(
    "pagination metadata is present",
    recommendations.pagination !== null &&
      typeof recommendations.pagination === "object",
  );

  TestValidator.predicate(
    "pagination has valid current page",
    typeof recommendations.pagination.current === "string" &&
      recommendations.pagination.current.length > 0,
  );

  TestValidator.predicate(
    "pagination has valid limit",
    typeof recommendations.pagination.limit === "string" &&
      recommendations.pagination.limit.length > 0,
  );

  TestValidator.predicate(
    "pagination has valid records count",
    typeof recommendations.pagination.records === "string" &&
      recommendations.pagination.records.length > 0,
  );

  TestValidator.predicate(
    "pagination has valid total pages",
    typeof recommendations.pagination.pages === "string" &&
      recommendations.pagination.pages.length > 0,
  );

  // Step 6: Validate actual DTO properties from IEconomicDiscussionRecommendation
  recommendations.data.forEach((recommendation, index) => {
    TestValidator.predicate(
      `recommendation ${index} has valid ID`,
      typeof recommendation.id === "string" && recommendation.id.length > 0,
    );

    TestValidator.predicate(
      `recommendation ${index} has valid title`,
      typeof recommendation.title === "string" &&
        recommendation.title.length > 0,
    );

    TestValidator.predicate(
      `recommendation ${index} has valid content`,
      typeof recommendation.content === "string" &&
        recommendation.content.length > 0,
    );

    TestValidator.predicate(
      `recommendation ${index} has valid relevance score`,
      typeof recommendation.relevanceScore === "number" &&
        recommendation.relevanceScore >= 0 &&
        recommendation.relevanceScore <= 1,
    );

    TestValidator.predicate(
      `recommendation ${index} has valid categories array`,
      Array.isArray(recommendation.categories) &&
        recommendation.categories.length >= 0,
    );

    TestValidator.predicate(
      `recommendation ${index} has valid created at timestamp`,
      typeof recommendation.createdAt === "string" &&
        recommendation.createdAt.length > 0,
    );

    TestValidator.predicate(
      `recommendation ${index} has valid updated at timestamp`,
      typeof recommendation.updatedAt === "string" &&
        recommendation.updatedAt.length > 0,
    );

    // Validate category summary structure within recommendations
    recommendation.categories.forEach((category, catIndex) => {
      TestValidator.predicate(
        `category ${catIndex} in recommendation ${index} has valid ID`,
        typeof category.id === "string" && category.id.length > 0,
      );

      TestValidator.predicate(
        `category ${catIndex} in recommendation ${index} has valid code`,
        typeof category.code === "string" && category.code.length > 0,
      );

      TestValidator.predicate(
        `category ${catIndex} in recommendation ${index} has valid name`,
        typeof category.name === "string" && category.name.length > 0,
      );

      TestValidator.predicate(
        `category ${catIndex} in recommendation ${index} has valid display order`,
        typeof category.displayOrder === "number" && category.displayOrder >= 0,
      );

      TestValidator.predicate(
        `category ${catIndex} in recommendation ${index} has valid active status`,
        typeof category.isActive === "boolean",
      );

      TestValidator.predicate(
        `category ${catIndex} in recommendation ${index} has valid article count`,
        typeof category.articleCount === "number" && category.articleCount >= 0,
      );
    });
  });

  // Step 7: Validate that recommendations meet threshold criteria
  TestValidator.predicate(
    "all recommendations meet minimum relevance score",
    recommendations.data.every((rec) => rec.relevanceScore >= 0.5),
  );

  TestValidator.predicate(
    "all recommendations have valid date formats",
    recommendations.data.every((rec) => {
      const createdDate = new Date(rec.createdAt);
      const updatedDate = new Date(rec.updatedAt);
      return !isNaN(createdDate.getTime()) && !isNaN(updatedDate.getTime());
    }),
  );

  // Step 8: Test edge case with empty parameters to ensure graceful handling
  const emptyRequestData =
    {} satisfies IEconomicDiscussionRecommendationsRequest;

  const emptyRecommendations =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      { body: emptyRequestData },
    );
  typia.assert(emptyRecommendations);

  TestValidator.predicate(
    "empty request returns valid recommendations structure",
    Array.isArray(emptyRecommendations.data) &&
      typeof emptyRecommendations.pagination === "object",
  );
}
