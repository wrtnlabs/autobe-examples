import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test search result pagination and ordering mechanisms using existing articles.
 * 1. Create user account and authenticate
 * 2. Test pagination parameters (page, limit) with existing article data
 * 3. Validate pagination metadata and result consistency
 * 4. Test edge cases including pages beyond results and zero-result searches
 */
export async function test_api_article_search_pagination_and_ordering(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // First, get baseline search results to understand available data
  const baselineResponse =
    await api.functional.discussionBoard.user.search.articles.search(
      userConnection,
      {
        body: {
          page: 1,
          limit: 100, // Large limit to see total available articles
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(baselineResponse);
  // Access the deeply nested pagination structure correctly
  const totalArticles =
    baselineResponse.pagination.pagination.pagination.pagination.records;
  // Test pagination with different page sizes only if we have articles
  if (totalArticles > 0) {
    const testLimits = [5, 10, 15] as const;
    for (const limit of testLimits) {
      const page1Response =
        await api.functional.discussionBoard.user.search.articles.search(
          userConnection,
          {
            body: {
              page: 1,
              limit: limit satisfies number as number,
            } satisfies IDiscussionBoardArticle.IRequest,
          },
        );
      typia.assert(page1Response);
      TestValidator.equals(
        `page 1 has correct limit ${limit}`,
        page1Response.data.length,
        Math.min(limit, totalArticles),
      );
      TestValidator.equals(
        `page 1 current page correct`,
        page1Response.pagination.pagination.pagination.pagination.current,
        1,
      );
      TestValidator.equals(
        `page 1 total records consistent`,
        page1Response.pagination.pagination.pagination.pagination.records,
        totalArticles,
      );
      // Test page 2 if there are more results
      if (page1Response.pagination.pagination.pagination.pagination.pages > 1) {
        const page2Response =
          await api.functional.discussionBoard.user.search.articles.search(
            userConnection,
            {
              body: {
                page: 2,
                limit: limit satisfies number as number,
              } satisfies IDiscussionBoardArticle.IRequest,
            },
          );
        typia.assert(page2Response);
        const expectedPage2Count = Math.min(limit, totalArticles - limit);
        TestValidator.equals(
          `page 2 has correct count for limit ${limit}`,
          page2Response.data.length,
          expectedPage2Count,
        );
        TestValidator.equals(
          `page 2 current page correct`,
          page2Response.pagination.pagination.pagination.pagination.current,
          2,
        );
        // Verify no overlap between page 1 and page 2 results
        const page1Ids = new Set(
          page1Response.data.map((article) => article.id),
        );
        const page2Ids = new Set(
          page2Response.data.map((article) => article.id),
        );
        TestValidator.predicate(
          `page 1 and 2 have no overlap for limit ${limit}`,
          page2Response.data.every((article) => !page1Ids.has(article.id)),
        );
      }
    }
    // Test single-page result scenario with large limit
    const singlePageResponse =
      await api.functional.discussionBoard.user.search.articles.search(
        userConnection,
        {
          body: {
            page: 1,
            limit: totalArticles + 10, // Large enough to capture all results
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(singlePageResponse);
    TestValidator.predicate(
      "single page scenario valid",
      singlePageResponse.pagination.pagination.pagination.pagination.pages ===
        1,
    );
    TestValidator.equals(
      "single page returns all articles",
      singlePageResponse.data.length,
      totalArticles,
    );
  }
  // Test edge case: page beyond available results
  const beyondPageResponse =
    await api.functional.discussionBoard.user.search.articles.search(
      userConnection,
      {
        body: {
          page: 100, // Very high page number
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "beyond page returns empty data",
    beyondPageResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "beyond page has valid pagination",
    beyondPageResponse.pagination.pagination.pagination.pagination.current ===
      100,
  );
  // Test edge case: zero results search with unique non-existent term
  const zeroResultsResponse =
    await api.functional.discussionBoard.user.search.articles.search(
      userConnection,
      {
        body: {
          title: `nonexistent_unique_title_${RandomGenerator.alphaNumeric(10)}`,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(zeroResultsResponse);
  TestValidator.equals(
    "zero results search returns empty",
    zeroResultsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "zero results has zero records",
    zeroResultsResponse.pagination.pagination.pagination.pagination.records,
    0,
  );
  // Test search with content filter to verify search functionality
  const contentSearchResponse =
    await api.functional.discussionBoard.user.search.articles.search(
      userConnection,
      {
        body: {
          content: RandomGenerator.substring(
            RandomGenerator.content({ paragraphs: 1 }),
          ),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(contentSearchResponse);
  // Validate pagination structure consistency
  TestValidator.predicate(
    "pagination structure valid",
    contentSearchResponse.pagination.pagination.pagination.pagination.pages ===
      Math.ceil(
        contentSearchResponse.pagination.pagination.pagination.pagination
          .records /
          contentSearchResponse.pagination.pagination.pagination.pagination
            .limit,
      ),
  );
}
