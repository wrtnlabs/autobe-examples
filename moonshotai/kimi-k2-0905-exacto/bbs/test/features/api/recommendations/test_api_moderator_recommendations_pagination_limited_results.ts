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
import type { IEconomicDiscussionCategorySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategorySummary";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IEconomicDiscussionRecommendation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendation";
import type { IEconomicDiscussionRecommendationsList } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendationsList";
import type { IEconomicDiscussionRecommendationsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendationsRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test moderator discovery recommendations with pagination and limited result
 * sets.
 *
 * This comprehensive test validates the recommendation system's pagination
 * functionality and result limiting capabilities. The test creates sufficient
 * article data to test various pagination scenarios and ensures that maxResults
 * parameter properly constrains the response size. Additionally, it verifies
 * that pagination metadata accurately reflects the result set boundaries for
 * optimal presentation.
 *
 * The test follows this workflow:
 *
 * 1. Create a moderator account for authentication
 * 2. Generate multiple diverse articles to ensure adequate data volume
 * 3. Test recommendations with different maxResults limits (5, 10, 20)
 * 4. Verify pagination metadata accuracy for each limit
 * 5. Validate result quality and relevance scoring
 * 6. Ensure proper data relationships and content discoverability
 */
export async function test_api_moderator_recommendations_pagination_limited_results(
  connection: api.IConnection,
) {
  // Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(16),
      moderation_level: "standard",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Create multiple diverse articles for recommendation testing
  const categories = [
    "economics",
    "politics",
    "policy",
    "trade",
    "finance",
  ] as const;
  const articles = await ArrayUtil.asyncRepeat(25, async (index) => {
    const categoryId = typia.random<string & tags.Format<"uuid">>();
    const categoryName = RandomGenerator.pick(categories);

    return await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: {
          title: `Economic Analysis: ${RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 })}`,
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 8,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 10,
          }),
          category_ids: [categoryId],
          attachments: [],
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  });

  // Validate all articles were created successfully
  TestValidator.equals("article creation count", articles.length, 25);

  // Test recommendation with maxResults = 5 (minimum limit)
  const recommendations5 =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      {
        body: {
          maxResults: 5,
          categoryIds: undefined,
          searchKeywords: undefined,
          interactionHistory: undefined,
          minRelevanceScore: 0.1,
        } satisfies IEconomicDiscussionRecommendationsRequest,
      },
    );
  typia.assert(recommendations5);

  // Validate 5 results returned with proper pagination
  TestValidator.equals(
    "maxResults=5 data length returns correct count",
    recommendations5.data.length,
    5,
  );
  TestValidator.predicate(
    "maxResults=5 pagination exists",
    recommendations5.pagination !== null,
  );
  TestValidator.predicate(
    "maxResults=5 relevance scores valid",
    recommendations5.data.every(
      (rec) => rec.relevanceScore >= 0.1 && rec.relevanceScore <= 1.0,
    ),
  );

  // Test recommendation with maxResults = 10 (medium limit)
  const recommendations10 =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      {
        body: {
          maxResults: 10,
          categoryIds: undefined,
          searchKeywords: undefined,
          interactionHistory: undefined,
          minRelevanceScore: 0.2,
        } satisfies IEconomicDiscussionRecommendationsRequest,
      },
    );
  typia.assert(recommendations10);

  // Validate 10 results returned with proper pagination
  TestValidator.equals(
    "maxResults=10 data length returns correct count",
    recommendations10.data.length,
    10,
  );
  TestValidator.predicate(
    "maxResults=10 pagination exists",
    recommendations10.pagination !== null,
  );
  TestValidator.predicate(
    "maxResults=10 relevance scores valid",
    recommendations10.data.every(
      (rec) => rec.relevanceScore >= 0.2 && rec.relevanceScore <= 1.0,
    ),
  );

  // Test recommendation with maxResults = 20 (higher limit)
  const recommendations20 =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      {
        body: {
          maxResults: 20,
          categoryIds: undefined,
          searchKeywords: undefined,
          interactionHistory: undefined,
          minRelevanceScore: 0.3,
        } satisfies IEconomicDiscussionRecommendationsRequest,
      },
    );
  typia.assert(recommendations20);

  // Validate 20 results returned with proper pagination
  TestValidator.equals(
    "maxResults=20 data length returns correct count",
    recommendations20.data.length,
    20,
  );
  TestValidator.predicate(
    "maxResults=20 pagination exists",
    recommendations20.pagination !== null,
  );
  TestValidator.predicate(
    "maxResults=20 relevance scores valid",
    recommendations20.data.every(
      (rec) => rec.relevanceScore >= 0.3 && rec.relevanceScore <= 1.0,
    ),
  );

  // Validate recommendation data structure and quality
  TestValidator.predicate(
    "recommendations have valid UUID IDs",
    recommendations5.data.every((rec) => rec.id && rec.id.length === 36),
  );
  TestValidator.predicate(
    "recommendations have valid titles",
    recommendations5.data.every(
      (rec) => rec.title && rec.title.length >= 1 && rec.title.length <= 500,
    ),
  );
  TestValidator.predicate(
    "recommendations have content excerpts",
    recommendations5.data.every(
      (rec) =>
        rec.content && rec.content.length >= 10 && rec.content.length <= 50000,
    ),
  );
  TestValidator.predicate(
    "recommendations have author names",
    recommendations5.data.every(
      (rec) => rec.authorName && rec.authorName.length > 0,
    ),
  );
  TestValidator.predicate(
    "recommendations have valid category counts",
    recommendations5.data.every(
      (rec) => rec.categoryCount >= 0 && rec.categoryCount <= 50,
    ),
  );
  TestValidator.predicate(
    "recommendations have view counts within bounds",
    recommendations5.data.every(
      (rec) => rec.viewCount >= 0 && rec.viewCount <= 1000000,
    ),
  );
  TestValidator.predicate(
    "recommendations have comment counts within bounds",
    recommendations5.data.every(
      (rec) => rec.commentCount >= 0 && rec.commentCount <= 10000,
    ),
  );
  TestValidator.predicate(
    "recommendations have valid reasons",
    recommendations5.data.every(
      (rec) => rec.recommendationReason && rec.recommendationReason.length > 0,
    ),
  );

  // Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination structure is valid",
    recommendations5.pagination.current !== undefined &&
      recommendations5.pagination.pages !== undefined &&
      recommendations5.pagination.records !== undefined,
  );

  // Test with category filtering
  const categoryFiltered =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      {
        body: {
          maxResults: 10,
          categoryIds: [typia.random<string & tags.Format<"uuid">>()],
          searchKeywords: undefined,
          interactionHistory: undefined,
        } satisfies IEconomicDiscussionRecommendationsRequest,
      },
    );
  typia.assert(categoryFiltered);

  TestValidator.equals(
    "category filtered results length",
    categoryFiltered.data.length,
    10,
  );
  TestValidator.predicate(
    "category filtered results have categories",
    categoryFiltered.data.every((rec) => rec.categories.length > 0),
  );

  // Test with search keywords
  const keywordFiltered =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      {
        body: {
          maxResults: 8,
          categoryIds: undefined,
          searchKeywords: ["economic", "policy", "analysis"],
          interactionHistory: undefined,
          minRelevanceScore: 0.15,
        } satisfies IEconomicDiscussionRecommendationsRequest,
      },
    );
  typia.assert(keywordFiltered);

  TestValidator.equals(
    "keyword filtered results length",
    keywordFiltered.data.length,
    8,
  );
  TestValidator.predicate(
    "keyword filtered results have valid structure",
    keywordFiltered.data.every(
      (rec) =>
        rec.relevanceScore >= 0.15 &&
        rec.relevanceScore <= 1.0 &&
        rec.title.length > 0,
    ),
  );

  // Test with interaction history
  const interactionFiltered =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      {
        body: {
          maxResults: 12,
          categoryIds: undefined,
          searchKeywords: undefined,
          interactionHistory: articles.slice(0, 5).map((article) => article.id),
          minRelevanceScore: 0.25,
        } satisfies IEconomicDiscussionRecommendationsRequest,
      },
    );
  typia.assert(interactionFiltered);

  TestValidator.equals(
    "interaction filtered results length",
    interactionFiltered.data.length,
    12,
  );
  TestValidator.predicate(
    "interaction filtered results avoid previously viewed",
    interactionFiltered.data.every(
      (rec) => !articles.slice(0, 5).some((article) => article.id === rec.id),
    ),
  );

  // Test maximum limit boundary
  await TestValidator.error(
    "maxResults exceeds maximum limit should fail",
    async () => {
      await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
        connection,
        {
          body: {
            maxResults: 60, // Exceeds maximum of 50
            categoryIds: undefined,
            searchKeywords: undefined,
            interactionHistory: undefined,
          } satisfies IEconomicDiscussionRecommendationsRequest,
        },
      );
    },
  );

  // Test minimum limit boundary
  await TestValidator.error(
    "maxResults below minimum should fail",
    async () => {
      await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
        connection,
        {
          body: {
            maxResults: 0, // Below minimum of 1
            categoryIds: undefined,
            searchKeywords: undefined,
            interactionHistory: undefined,
          } satisfies IEconomicDiscussionRecommendationsRequest,
        },
      );
    },
  );
}
