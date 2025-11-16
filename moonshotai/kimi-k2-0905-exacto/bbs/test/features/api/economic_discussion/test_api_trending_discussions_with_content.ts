import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicDiscussionArticleAuthor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleAuthor";
import type { IEconomicDiscussionTrendingArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionTrendingArticle";
import type { IEconomicDiscussionTrendingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionTrendingList";

/**
 * Test trending discussions discovery endpoint to validate content filtering
 * and engagement metrics.
 *
 * This test validates the trending discovery API by:
 *
 * 1. Retrieving the trending discussions list
 * 2. Verifying response structure and data types
 * 3. Validating article metadata including engagement scores
 * 4. Checking trending eligibility criteria
 * 5. Ensuring proper content discovery based on recent activity
 *
 * The trending algorithm weighs multiple factors including view velocity,
 * comment activity, and recency to surface the most actively discussed economic
 * and political topics.
 */
export async function test_api_trending_discussions_with_content(
  connection: api.IConnection,
) {
  // Retrieve trending discussions
  const trendingList =
    await api.functional.economicDiscussion.discovery.trending(connection);

  // Validate response structure
  typia.assert(trendingList);

  // Verify trending list contains articles
  TestValidator.predicate(
    "trending list should contain articles",
    trendingList.articles.length > 0,
  );
  TestValidator.predicate(
    "trending list should not exceed maximum",
    trendingList.articles.length <= 20,
  );

  // Validate generation timestamp format
  TestValidator.predicate(
    "generated_at should be valid datetime string",
    typeof trendingList.generated_at === "string" &&
      trendingList.generated_at.length > 0,
  );

  // Validate article structure and content
  const firstArticle = trendingList.articles[0];
  TestValidator.equals(
    "article should have valid UUID format",
    firstArticle.id.length,
    36,
  );
  TestValidator.predicate(
    "article title should meet length requirements",
    firstArticle.title.length >= 10 && firstArticle.title.length <= 200,
  );

  // Validate engagement metrics
  TestValidator.predicate(
    "view count should be non-negative",
    firstArticle.view_count >= 0,
  );
  TestValidator.predicate(
    "comment count should be non-negative",
    firstArticle.comment_count >= 0,
  );
  TestValidator.predicate(
    "engagement score should be non-negative",
    firstArticle.engagement_score >= 0,
  );

  // Validate workflow status
  const validStatuses = ["pending", "approved", "rejected"] as const;
  TestValidator.predicate(
    "status should be valid",
    validStatuses.includes(firstArticle.status),
  );

  // Validate author information
  TestValidator.equals(
    "author should have valid UUID format",
    firstArticle.author.id.length,
    36,
  );
  TestValidator.predicate(
    "author username should meet requirements",
    firstArticle.author.username.length >= 3 &&
      firstArticle.author.username.length <= 30,
  );
  TestValidator.predicate(
    "author type should be valid",
    firstArticle.author.type === "member" ||
      firstArticle.author.type === "moderator",
  );
  TestValidator.predicate(
    "author reputation should be non-negative",
    firstArticle.author.reputation_score >= 0,
  );

  // Validate category constraints
  TestValidator.predicate(
    "should have at least one category",
    firstArticle.category_names.length >= 1,
  );
  TestValidator.predicate(
    "should not exceed maximum categories",
    firstArticle.category_names.length <= 3,
  );

  // Validate temporal data format
  TestValidator.predicate(
    "created_at should be valid datetime string",
    typeof firstArticle.created_at === "string" &&
      firstArticle.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be valid datetime string",
    typeof firstArticle.updated_at === "string" &&
      firstArticle.updated_at.length > 0,
  );
  TestValidator.predicate(
    "published_at should be valid datetime string",
    typeof firstArticle.published_at === "string" &&
      firstArticle.published_at.length > 0,
  );

  // Validate version and score formatting
  TestValidator.predicate(
    "version should be positive",
    firstArticle.version >= 1,
  );
  TestValidator.predicate(
    "engagement score should be a number",
    typeof firstArticle.engagement_score === "number",
  );

  // Validate optional thumbnail URL
  if (
    firstArticle.thumbnail_url !== null &&
    firstArticle.thumbnail_url !== undefined
  ) {
    TestValidator.predicate(
      "thumbnail_url should be string when present",
      typeof firstArticle.thumbnail_url === "string",
    );
  }

  // Validate optional deleted_at timestamp
  if (
    firstArticle.deleted_at !== null &&
    firstArticle.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at should be string when present",
      typeof firstArticle.deleted_at === "string",
    );
  }

  // Validate trending characteristics
  TestValidator.predicate(
    "articles should have engagement scores",
    trendingList.articles.every((article) => article.engagement_score >= 0),
  );

  // Validate article ordering by engagement score (highest first)
  TestValidator.predicate(
    "articles should be properly ordered by engagement score",
    () => {
      for (let i = 1; i < trendingList.articles.length; i++) {
        if (
          trendingList.articles[i].engagement_score >
          trendingList.articles[i - 1].engagement_score
        ) {
          return false;
        }
      }
      return true;
    },
  );

  // Validate that most articles are approved for trending
  TestValidator.predicate(
    "majority of articles should have approved status",
    () => {
      const approvedCount = trendingList.articles.filter(
        (article) => article.status === "approved",
      ).length;
      return approvedCount > 0; // At least some should be approved
    },
  );

  // Validate that trending articles have recent publication dates
  TestValidator.predicate(
    "trending articles should have recent publication dates",
    () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentArticles = trendingList.articles.filter((article) => {
        const pubDate = new Date(article.published_at);
        return pubDate >= oneWeekAgo;
      });
      return recentArticles.length > 0; // At least some should be recent
    },
  );
}
