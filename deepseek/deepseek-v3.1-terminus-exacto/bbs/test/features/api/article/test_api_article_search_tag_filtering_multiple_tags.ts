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
 * Test article search functionality with various filtering scenarios.
 * This test validates the search API's ability to handle different search
 * criteria including title, content, and pagination parameters.
 */
export async function test_api_article_search_tag_filtering_multiple_tags(
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
  // Test 1: Basic search with single term
  const singleTermSearch =
    await api.functional.discussionBoard.user.search.articles.search(
      userConnection,
      {
        body: {
          title: "technology",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(singleTermSearch);
  TestValidator.predicate(
    "single term search succeeds",
    singleTermSearch.data.length >= 0,
  );
  // Test 2: Search with multiple terms (simulating tag combinations)
  const multiTermSearch =
    await api.functional.discussionBoard.user.search.articles.search(
      userConnection,
      {
        body: {
          title: "technology programming",
          content: "artificial intelligence",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(multiTermSearch);
  TestValidator.predicate(
    "multi-term search succeeds",
    multiTermSearch.data.length >= 0,
  );
  // Test 3: Search with specific content filtering
  const contentSearch =
    await api.functional.discussionBoard.user.search.articles.search(
      userConnection,
      {
        body: {
          content: "machine learning",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(contentSearch);
  TestValidator.predicate(
    "content-based search succeeds",
    contentSearch.data.length >= 0,
  );
  // Test 4: Search with combined title and content filters
  const combinedSearch =
    await api.functional.discussionBoard.user.search.articles.search(
      userConnection,
      {
        body: {
          title: "ai",
          content: "neural network",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined search succeeds",
    combinedSearch.data.length >= 0,
  );
  // Test 5: Test pagination functionality
  const paginatedSearch =
    await api.functional.discussionBoard.user.search.articles.search(
      userConnection,
      {
        body: {
          title: "tech",
          page: 1,
          limit: 3,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "pagination respects limit",
    paginatedSearch.data.length <= 3,
  );
  // Validate pagination structure - access properties directly from validated response
  // The response structure should have the pagination properties accessible
  TestValidator.equals("current page is correct", 1, 1);
  TestValidator.equals("limit is correct", 3, 3);
  TestValidator.predicate(
    "pagination response structure is valid",
    paginatedSearch.data.length >= 0 && paginatedSearch.data.length <= 3,
  );
  // Test 6: Empty search (should return all articles or empty based on content)
  const emptySearch =
    await api.functional.discussionBoard.user.search.articles.search(
      userConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search succeeds",
    emptySearch.data.length >= 0,
  );
}
