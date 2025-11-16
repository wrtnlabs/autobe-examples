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
 * Test moderator discovery recommendations functionality with search keyword
 * integration. Validates that recommendations incorporate provided keywords
 * from search history and surface articles with relevant content. Ensures the
 * recommendation system properly analyzes keyword context for economic and
 * political discussions.
 */
export async function test_api_moderator_recommendations_keyword_matching(
  connection: api.IConnection,
) {
  // Create moderator account for testing
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(1) + "_moderator",
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
      moderation_level: "standard",
      two_factor_enabled: true,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Create category for articles
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Create articles with targeted economic and political keywords
  const article1 =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: {
          title: "Federal Reserve Interest Rate Policy Analysis 2024",
          content:
            "The Federal Reserve's monetary policy decisions significantly impact inflation rates and employment levels. Recent interest rate adjustments reflect economic indicators including GDP growth, consumer price index, and labor market conditions. Economic analysis suggests these policies influence investment strategies across financial markets.",
          category_ids: [categoryId],
          attachments: undefined,
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article1);

  const article2 =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: {
          title: "Bipartisan Infrastructure Investment and Economic Stimulus",
          content:
            "Congressional debates over infrastructure spending highlight political divisions on fiscal policy. The bipartisan approach to economic stimulus packages demonstrates how political cooperation affects economic growth. Federal investment programs create employment opportunities while addressing critical infrastructure needs across diverse economic sectors.",
          category_ids: [categoryId],
          attachments: undefined,
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article2);

  const article3 =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: {
          title: "Global Trade Relations and Economic Diplomacy",
          content:
            "International economic partnerships influence domestic economic outcomes through trade agreements and diplomatic negotiations. Political considerations shape economic policy decisions regarding tariffs, trade barriers, and international commerce. Economic stability depends on maintaining stable relationships with major trading partners and addressing political tensions that affect global markets.",
          category_ids: [categoryId],
          attachments: undefined,
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article3);

  const article4 =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: {
          title: "Cryptocurrency Market Regulation and Policy Framework",
          content:
            "Emerging digital asset markets present regulatory challenges for financial institutions and government agencies. Economic implications of cryptocurrency adoption include tax policy considerations, monetary system impacts, and consumer protection measures. Political debates continue regarding appropriate regulatory frameworks for blockchain technologies and their role in the modern financial ecosystem.",
          category_ids: [categoryId],
          attachments: undefined,
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article4);

  // Test recommendations with economic keywords
  const economicRecommendations =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      {
        body: {
          searchKeywords: [
            "Federal Reserve",
            "interest rates",
            "monetary policy",
            "inflation",
          ],
          categoryIds: [categoryId],
          maxResults: 2,
          minRelevanceScore: 0.7,
        } satisfies IEconomicDiscussionRecommendationsRequest,
      },
    );
  typia.assert(economicRecommendations);

  // Validate economic recommendations contain relevant articles
  TestValidator.predicate(
    "economic recommendations should contain articles",
    economicRecommendations.data.length > 0,
  );
  TestValidator.equals(
    "first recommendation title should mention economic keywords",
    economicRecommendations.data[0].title.includes("Federal Reserve") ||
      economicRecommendations.data[0].content.includes("interest rates"),
    true,
  );
  TestValidator.predicate(
    "relevance score should meet minimum threshold",
    economicRecommendations.data[0].relevanceScore >= 0.7,
  );

  // Test recommendations with political keywords
  const politicalRecommendations =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      {
        body: {
          searchKeywords: [
            "bipartisan",
            "Congressional",
            "political cooperation",
            "federal investment",
          ],
          categoryIds: [categoryId],
          maxResults: 2,
          minRelevanceScore: 0.6,
        } satisfies IEconomicDiscussionRecommendationsRequest,
      },
    );
  typia.assert(politicalRecommendations);

  // Validate political recommendations
  TestValidator.predicate(
    "political recommendations should exist",
    politicalRecommendations.data.length > 0,
  );
  TestValidator.predicate(
    "political content should be relevant",
    politicalRecommendations.data.some(
      (article) =>
        article.title.includes("bipartisan") ||
        article.content.includes("political") ||
        article.content.includes("Congressional"),
    ),
  );

  // Test recommendations with mixed economic-political keywords
  const mixedRecommendations =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      {
        body: {
          searchKeywords: [
            "trade relations",
            "economic diplomacy",
            "global markets",
            "political tensions",
          ],
          categoryIds: [categoryId],
          maxResults: 3,
          minRelevanceScore: 0.5,
        } satisfies IEconomicDiscussionRecommendationsRequest,
      },
    );
  typia.assert(mixedRecommendations);

  // Validate mixed recommendations
  TestValidator.predicate(
    "mixed recommendations should return multiple articles",
    mixedRecommendations.data.length >= 2,
  );
  TestValidator.predicate(
    "should include articles with both economic and political content",
    mixedRecommendations.data.some(
      (article) =>
        article.content.includes("economic") &&
        article.content.includes("political"),
    ),
  );

  // Test empty keyword handling
  const emptyKeywordRecommendations =
    await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
      connection,
      {
        body: {
          searchKeywords: [],
          categoryIds: [categoryId],
          maxResults: 1,
        } satisfies IEconomicDiscussionRecommendationsRequest,
      },
    );
  typia.assert(emptyKeywordRecommendations);
}
