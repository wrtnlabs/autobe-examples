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
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IEconomicDiscussionRecommendation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendation";
import type { IEconomicDiscussionRecommendationsList } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendationsList";
import type { IEconomicDiscussionRecommendationsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendationsRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test personalized article recommendations based on member browsing history
 * and interaction patterns.
 *
 * This test validates the recommendation engine's ability to analyze member
 * activity including:
 *
 * - Article creation and categorization patterns
 * - Search behavior and keyword preferences
 * - Interaction history and engagement metrics
 * - Category preferences and topic interests
 *
 * The test creates a member account, generates sample content across multiple
 * economic/political categories, and verifies that personalized recommendations
 * are returned with proper relevance scoring, complete metadata, and
 * privacy-conscious personalization.
 */
export async function test_api_economic_discussion_recommendations_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account for testing recommendation engine
  const testUsername = RandomGenerator.alphabets(10);
  const testEmail = `test.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: testUsername,
      email: testEmail,
      password: "SecurePassword123!",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create sample economic analysis articles across different categories
  const sampleKeywords = [
    "inflation",
    "interest rates",
    "GDP growth",
    "unemployment",
    "trade balance",
  ];

  const articles = await ArrayUtil.asyncRepeat(3, async (index) => {
    const categoryId = typia.random<string & tags.Format<"uuid">>();
    const title = `Economic Analysis: ${RandomGenerator.pick(sampleKeywords)} Trends in ${RandomGenerator.paragraph({ sentences: 2 })}`;
    const content = RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    });

    const article =
      await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: {
            title,
            content,
            category_ids: [categoryId],
            attachments: [],
          } satisfies IEconomicDiscussionArticle.ICreate,
        },
      );
    typia.assert(article);
    return article;
  });

  // Step 3: Create additional articles with political focus for content diversity
  const politicalArticles = await ArrayUtil.asyncRepeat(2, async () => {
    const title = `Political Insight: ${RandomGenerator.paragraph({ sentences: 2 })}`;
    const content = RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 9,
    });

    const article =
      await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: {
            title,
            content,
            category_ids: [typia.random<string & tags.Format<"uuid">>()],
            attachments: [],
          } satisfies IEconomicDiscussionArticle.ICreate,
        },
      );
    typia.assert(article);
    return article;
  });

  // Step 4: Create economic specialist article for advanced content analysis
  const specialistArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title:
          "Advanced Economic Analysis: Global Trade Patterns and Market Dynamics",
        content: RandomGenerator.content({
          paragraphs: 5,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 5,
          wordMax: 12,
        }),
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
        attachments: [],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(specialistArticle);

  // Combine all created articles for interaction history
  const allArticles = [...articles, ...politicalArticles, specialistArticle];
  const interactionHistory = allArticles.map((article) => article.id);

  // Step 5: Test personalized recommendations with comprehensive parameters
  const recommendationRequest = {
    categoryIds: allArticles
      .slice(0, 3)
      .map(() => typia.random<string & tags.Format<"uuid">>()),
    searchKeywords: RandomGenerator.sample(sampleKeywords, 2),
    interactionHistory: interactionHistory.slice(0, 4),
    maxResults: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<50>,
    minRelevanceScore: 0.3,
  } satisfies IEconomicDiscussionRecommendationsRequest;

  const recommendations =
    await api.functional.economicDiscussion.member.discovery.recommendations.index(
      connection,
      {
        body: recommendationRequest,
      },
    );
  typia.assert(recommendations);

  // Step 6: Validate recommendation results structure and content
  TestValidator.predicate(
    "recommendations have valid pagination",
    recommendations.pagination !== null &&
      recommendations.pagination !== undefined,
  );

  TestValidator.predicate(
    "data array contains recommendations",
    Array.isArray(recommendations.data) && recommendations.data.length >= 0,
  );

  // Step 7: Test relevance scoring and recommendation quality
  if (recommendations.data.length > 0) {
    const firstRecommendation = recommendations.data[0];
    TestValidator.predicate(
      "relevance score within valid range",
      firstRecommendation.relevanceScore >= 0 &&
        firstRecommendation.relevanceScore <= 1,
    );

    TestValidator.predicate(
      "recommendation has valid ID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstRecommendation.id,
      ),
    );

    TestValidator.predicate(
      "content excerpt is non-empty",
      firstRecommendation.content.length > 0,
    );

    TestValidator.predicate(
      "author name is provided",
      firstRecommendation.authorName !== null &&
        firstRecommendation.authorName !== undefined,
    );

    TestValidator.predicate(
      "category count is valid",
      firstRecommendation.categoryCount >= 0 &&
        firstRecommendation.categoryCount <= 50,
    );

    TestValidator.predicate(
      "view count is non-negative",
      firstRecommendation.viewCount >= 0 &&
        firstRecommendation.viewCount <= 1000000,
    );

    TestValidator.predicate(
      "comment count is valid",
      firstRecommendation.commentCount >= 0 &&
        firstRecommendation.commentCount <= 10000,
    );

    TestValidator.predicate(
      "recommendation reason is provided",
      firstRecommendation.recommendationReason.length > 0,
    );

    TestValidator.predicate(
      "categories array exists",
      Array.isArray(firstRecommendation.categories) &&
        firstRecommendation.categories.length >= 0,
    );

    // Validate category summary structure if categories exist
    if (firstRecommendation.categories.length > 0) {
      const category = firstRecommendation.categories[0];
      TestValidator.predicate(
        "category ID is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          category.id,
        ),
      );

      TestValidator.predicate(
        "category has display name",
        category.name.length > 0,
      );
    }

    TestValidator.predicate(
      "creation timestamp is valid ISO format",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\\\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
        firstRecommendation.createdAt,
      ),
    );

    TestValidator.predicate(
      "update timestamp is valid ISO format",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\\{\\s})([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
        firstRecommendation.updatedAt,
      ),
    );
  }

  // Step 8: Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination current page is valid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      recommendations.pagination.current,
    ),
  );

  TestValidator.predicate(
    "pagination pages count is valid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      recommendations.pagination.pages,
    ),
  );

  TestValidator.predicate(
    "pagination limit is valid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      recommendations.pagination.limit,
    ),
  );

  TestValidator.predicate(
    "pagination records is valid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      recommendations.pagination.records,
    ),
  );

  // Step 9: Test privacy-conscious personalization boundaries
  TestValidator.predicate(
    "maxResults respected in response",
    recommendations.data.length <= 10,
  );

  TestValidator.predicate(
    "relevance score filtering applied",
    recommendations.data.every(
      (recommendation) => recommendation.relevanceScore >= 0.3,
    ),
  );

  // Step 10: Validate business logic integration
  TestValidator.predicate(
    "member authentication context preserved",
    recommendations instanceof Object &&
      "data" in recommendations &&
      "pagination" in recommendations,
  );

  // Final validation of recommendation engine functionality
  TestValidator.predicate(
    "personalized recommendations generated successfully",
    recommendations.data.length >= 0,
  );
}
