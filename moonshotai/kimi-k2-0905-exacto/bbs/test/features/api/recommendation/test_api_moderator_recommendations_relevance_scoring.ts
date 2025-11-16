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
 * Test moderator discovery recommendations relevance scoring functionality.
 * This test validates that the recommendation engine properly scores economic
 * and political discussion articles based on moderator preferences, search
 * history, and interaction patterns. It verifies that relevance scores are
 * calculated accurately and that filtering based on minimum relevance
 * thresholds works correctly.
 *
 * Test Process:
 *
 * 1. Create a moderator account with elevated permissions
 * 2. Generate multiple economic discussion articles with varying characteristics
 * 3. Configure recommendation preferences with different relevance thresholds
 * 4. Verify that articles above minRelevanceScore threshold are included
 * 5. Validate that articles below the threshold are filtered out
 * 6. Check that relevance scores are in the valid 0.0-1.0 range
 * 7. Ensure pagination metadata is correctly populated
 */
export async function test_api_moderator_recommendations_relevance_scoring(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for testing
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: RandomGenerator.pick([
        "standard",
        "senior",
        "admin",
      ] as const),
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple economic discussion articles with varying characteristics
  const categories = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const articles = [] as IEconomicDiscussionArticle[];

  for (let i = 0; i < 5; i++) {
    const content = RandomGenerator.content({
      paragraphs: 2 + Math.floor(Math.random() * 4), // 2-5 paragraphs
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 3,
      wordMax: 8,
    });

    const article =
      await api.functional.economicDiscussion.moderator.articles.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({
              sentences: 1 + Math.floor(Math.random() * 3),
              wordMin: 5,
              wordMax: 15,
            }),
            content,
            category_ids: categories.slice(
              0,
              Math.min(1 + Math.floor(Math.random() * 3), 3),
            ),
            attachments:
              i % 2 === 0
                ? [
                    {
                      file_size: 1000 + Math.floor(Math.random() * 99000),
                      file_type: RandomGenerator.pick([
                        "document",
                        "image",
                        "spreadsheet",
                      ] as const),
                      filename: `attachment_${i}.pdf`,
                      mime_type: "application/pdf",
                    } satisfies IEconomicDiscussionAttachments.ICreate,
                  ]
                : undefined,
          } satisfies IEconomicDiscussionArticle.ICreate,
        },
      );
    articles.push(article);
  }

  typia.assert(articles);

  // Step 3: Test recommendation with low relevance threshold (0.3)
  const lowThresholdRecommendations =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      {
        body: {
          categoryIds: categories.slice(0, 2),
          searchKeywords: ["economic", "policy", "political"],
          maxResults: 10,
          minRelevanceScore: 0.3,
          interactionHistory: articles.slice(0, 3).map((article) => article.id),
        } satisfies IEconomicDiscussionRecommendationsRequest,
      },
    );

  typia.assert(lowThresholdRecommendations);
  TestValidator.predicate(
    "low threshold should return multiple results",
    lowThresholdRecommendations.data.length > 0,
  );
  TestValidator.predicate(
    "relevance scores above 0.3",
    lowThresholdRecommendations.data.every(
      (article) =>
        article.relevanceScore >= 0.3 && article.relevanceScore <= 1.0,
    ),
  );

  // Step 4: Test recommendation with high relevance threshold (0.8)
  const highThresholdRecommendations =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      {
        body: {
          categoryIds: categories,
          searchKeywords: ["monetary", "fiscal", "trade"],
          maxResults: 5,
          minRelevanceScore: 0.8,
          interactionHistory: [],
        } satisfies IEconomicDiscussionRecommendationsRequest,
      },
    );

  typia.assert(highThresholdRecommendations);
  TestValidator.predicate(
    "high threshold should filter fewer results",
    highThresholdRecommendations.data.length <=
      lowThresholdRecommendations.data.length,
  );
  TestValidator.predicate(
    "all results above 0.8 threshold",
    highThresholdRecommendations.data.every(
      (article) =>
        article.relevanceScore >= 0.8 && article.relevanceScore <= 1.0,
    ),
  );

  // Step 5: Test pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    lowThresholdRecommendations.pagination !== undefined &&
      lowThresholdRecommendations.pagination.limit !== undefined &&
      lowThresholdRecommendations.pagination.records !== undefined,
  );

  // Step 6: Test recommendation content quality
  for (const recommendation of highThresholdRecommendations.data) {
    TestValidator.predicate(
      "recommendation has valid score",
      recommendation.relevanceScore >= 0 && recommendation.relevanceScore <= 1,
    );
    TestValidator.predicate(
      "recommendation has reason",
      recommendation.recommendationReason.length > 0,
    );
    TestValidator.predicate(
      "recommendation has basic metadata",
      recommendation.id !== undefined &&
        recommendation.title !== undefined &&
        recommendation.content !== undefined,
    );
  }

  // Step 7: Test with extremely high threshold (should return empty or very few)
  const extremeThresholdRecommendations =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      {
        body: {
          maxResults: 3,
          minRelevanceScore: 0.95,
        } satisfies IEconomicDiscussionRecommendationsRequest,
      },
    );

  typia.assert(extremeThresholdRecommendations);
  TestValidator.predicate(
    "extreme threshold returns minimal results",
    extremeThresholdRecommendations.data.length <= 2,
  );
  TestValidator.predicate(
    "all extreme threshold results are ultra-relevant",
    extremeThresholdRecommendations.data.every(
      (article) =>
        article.relevanceScore >= 0.95 && article.relevanceScore <= 1.0,
    ),
  );
}
