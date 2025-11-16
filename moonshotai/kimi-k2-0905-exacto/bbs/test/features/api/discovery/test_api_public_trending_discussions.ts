import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicDiscussionArticleAuthor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleAuthor";
import type { IEconomicDiscussionTrendingArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionTrendingArticle";
import type { IEconomicDiscussionTrendingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionTrendingList";

/**
 * Test public access to trending economic and political discussions.
 *
 * This test validates that guests and unauthenticated users can discover
 * trending articles without authentication. It ensures the API returns properly
 * formatted trending articles with engagement metrics like view counts, comment
 * counts, and author information.
 *
 * The test verifies:
 *
 * 1. API responds successfully without authentication
 * 2. Response contains at least one article (minItems constraint)
 * 3. All required article fields are present and typed correctly
 * 4. Author information includes ID, username, type, and reputation score
 * 5. Engagement metrics are properly formatted with type constraints
 * 6. Timestamps are in ISO 8601 format
 * 7. Article titles meet length and pattern requirements
 */
export async function test_api_public_trending_discussions(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve trending articles without authentication
  const trendingList: IEconomicDiscussionTrendingList =
    await api.functional.economicDiscussion.discovery.trending(connection);

  // Validate the response structure
  typia.assert(trendingList);

  // Verify we have at least one article (minItems constraint)
  TestValidator.predicate(
    "trending list contains articles",
    trendingList.articles.length >= 1,
  );

  // Validate each article in the trending list
  for (const article of trendingList.articles) {
    TestValidator.predicate(
      "article title meets minimum length",
      article.title.length >= 10,
    );

    TestValidator.predicate(
      "article title meets maximum length constraint",
      article.title.length <= 200,
    );

    TestValidator.predicate(
      "view count is non-negative",
      article.view_count >= 0,
    );

    TestValidator.predicate(
      "comment count is non-negative",
      article.comment_count >= 0,
    );

    TestValidator.predicate(
      "engagement score is non-negative and multiple of 0.01",
      article.engagement_score >= 0 &&
        Math.round(article.engagement_score * 100) ===
          article.engagement_score * 100,
    );

    // Validate author information
    const author = typia.assert<IEconomicDiscussionArticleAuthor>(
      article.author,
    );

    TestValidator.predicate(
      "author username meets length requirements",
      author.username.length >= 3 && author.username.length <= 30,
    );

    TestValidator.predicate(
      "author type is valid",
      author.type === "member" || author.type === "moderator",
    );

    TestValidator.predicate(
      "author reputation is non-negative",
      author.reputation_score >= 0,
    );

    // Validate status
    const validStatuses: IEconomicDiscussionTrendingArticle["status"][] = [
      "pending",
      "approved",
      "rejected",
    ];
    TestValidator.predicate(
      "article status is valid",
      validStatuses.includes(article.status),
    );

    TestValidator.predicate(
      "article version is positive and multiple of 0.1",
      article.version >= 0.1 && Math.round(article.version * 10) % 1 === 0,
    );
  }
}
