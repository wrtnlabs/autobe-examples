import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test sorting articles by view_count to identify trending and popular
 * discussions.
 *
 * This test validates the article sorting functionality based on popularity
 * metrics (view_count). It creates multiple articles, simulates different
 * engagement levels by retrieving articles different numbers of times, then
 * validates that the search API correctly sorts articles by view_count in both
 * descending (most popular first) and ascending (least viewed first) order.
 *
 * Test workflow:
 *
 * 1. Register a member account for authentication
 * 2. Create multiple test articles with distinct content
 * 3. Simulate popularity by viewing each article a different number of times
 * 4. Search with sort_by='view_count' and sort_order='desc' to verify descending
 *    order
 * 5. Search with sort_by='view_count' and sort_order='asc' to verify ascending
 *    order
 * 6. Validate that articles are correctly ordered by their view counts
 */
export async function test_api_article_sorting_by_popularity(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    username: RandomGenerator.name(),
    href: "https://discussion-board.example.com/register",
    referrer: "https://discussion-board.example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create multiple articles with different titles for tracking
  const articleCount = 4;
  const articles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < articleCount; i++) {
    const articleData = {
      title: `Test Article ${i + 1} - ${RandomGenerator.name(2)}`,
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 10,
        sentenceMax: 20,
      }),
    } satisfies IDiscussionBoardArticle.ICreate;

    const createdArticle: IDiscussionBoardArticle =
      await api.functional.discussionBoard.articles.create(connection, {
        body: articleData,
      });
    typia.assert(createdArticle);
    articles.push(createdArticle);
  }

  // Step 3: Simulate different view counts by retrieving articles different numbers of times
  // Article 0: 1 view, Article 1: 3 views, Article 2: 5 views, Article 3: 2 views
  const viewCounts = [1, 3, 5, 2];

  for (let i = 0; i < articles.length; i++) {
    const targetViews = viewCounts[i];
    for (let viewIndex = 0; viewIndex < targetViews; viewIndex++) {
      const retrievedArticle: IDiscussionBoardArticle =
        await api.functional.discussionBoard.articles.at(connection, {
          articleId: articles[i].id,
        });
      typia.assert(retrievedArticle);
    }
  }

  // Step 4: Search articles sorted by view_count in descending order (most popular first)
  const descendingSearchRequest = {
    sort_by: "view_count",
    sort_order: "desc",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardArticle.IRequest;

  const descendingResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: descendingSearchRequest,
    });
  typia.assert(descendingResults);

  // Filter to only our test articles
  const ourArticleIds = articles.map((a) => a.id);
  const descendingSorted = descendingResults.data.filter((article) =>
    ourArticleIds.includes(article.id),
  );

  // Step 5: Validate descending order - articles should be sorted by view_count from highest to lowest
  // Expected order: Article 2 (5 views), Article 1 (3 views), Article 3 (2 views), Article 0 (1 view)
  TestValidator.predicate(
    "should have all test articles in descending results",
    descendingSorted.length >= articleCount,
  );

  for (let i = 0; i < descendingSorted.length - 1; i++) {
    TestValidator.predicate(
      `article at position ${i} should have view_count >= article at position ${i + 1}`,
      descendingSorted[i].view_count >= descendingSorted[i + 1].view_count,
    );
  }

  // Step 6: Search articles sorted by view_count in ascending order (least viewed first)
  const ascendingSearchRequest = {
    sort_by: "view_count",
    sort_order: "asc",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardArticle.IRequest;

  const ascendingResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: ascendingSearchRequest,
    });
  typia.assert(ascendingResults);

  // Filter to only our test articles
  const ascendingSorted = ascendingResults.data.filter((article) =>
    ourArticleIds.includes(article.id),
  );

  // Step 7: Validate ascending order - articles should be sorted by view_count from lowest to highest
  // Expected order: Article 0 (1 view), Article 3 (2 views), Article 1 (3 views), Article 2 (5 views)
  TestValidator.predicate(
    "should have all test articles in ascending results",
    ascendingSorted.length >= articleCount,
  );

  for (let i = 0; i < ascendingSorted.length - 1; i++) {
    TestValidator.predicate(
      `article at position ${i} should have view_count <= article at position ${i + 1}`,
      ascendingSorted[i].view_count <= ascendingSorted[i + 1].view_count,
    );
  }

  // Step 8: Verify specific view counts match expectations
  const article2Desc = descendingSorted.find((a) => a.id === articles[2].id);
  if (article2Desc) {
    TestValidator.equals(
      "most viewed article should have 5 views",
      article2Desc.view_count,
      5,
    );
  }

  const article0Asc = ascendingSorted.find((a) => a.id === articles[0].id);
  if (article0Asc) {
    TestValidator.equals(
      "least viewed article should have 1 view",
      article0Asc.view_count,
      1,
    );
  }
}
