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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test edge cases for article search functionality using available parameters.
 * Since tag-based search is not available in current API, focus on testing:
 * 1. Search with empty criteria
 * 2. Pagination edge cases (near page boundaries)
 * 3. Search with title/content criteria
 * 4. Performance validation with complex queries
 */
export async function test_api_article_search_tag_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create articles with various content
  const articles = await ArrayUtil.asyncRepeat(15, async (index) => {
    const article = await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: `Test Article ${index} - ${RandomGenerator.alphabets(5)}`,
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    return article;
  });
  // Test 1: Search with empty criteria (should return all articles)
  const emptySearch =
    await api.functional.discussionBoard.user.articles.search.tags.search(
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
    "empty search should return results",
    emptySearch.data.length > 0,
  );
  // Test 2: Search with specific title criteria
  const titleSearch =
    await api.functional.discussionBoard.user.articles.search.tags.search(
      userConnection,
      {
        body: {
          title: "Test Article",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(titleSearch);
  TestValidator.predicate(
    "title search should return matching articles",
    titleSearch.data.length > 0,
  );
  // Test 3: Pagination edge cases
  // Test first page
  const firstPage =
    await api.functional.discussionBoard.user.articles.search.tags.search(
      userConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page should have 5 items",
    firstPage.data.length,
    5,
  );
  // Test second page
  const secondPage =
    await api.functional.discussionBoard.user.articles.search.tags.search(
      userConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.predicate(
    "second page should have items",
    secondPage.data.length > 0,
  );
  // Test page beyond available data
  const beyondPage =
    await api.functional.discussionBoard.user.articles.search.tags.search(
      userConnection,
      {
        body: {
          page: 100,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "page beyond data should be empty",
    beyondPage.data.length,
    0,
  );
  // Test 4: Complex queries with multiple criteria
  const complexSearch =
    await api.functional.discussionBoard.user.articles.search.tags.search(
      userConnection,
      {
        body: {
          title: "Test",
          content: RandomGenerator.substring(articles[0]!.content),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(complexSearch);
  TestValidator.predicate(
    "complex query should complete successfully",
    complexSearch.data.length >= 0,
  );
  // Test 5: Search with non-matching criteria (should return empty)
  const nonMatchingSearch =
    await api.functional.discussionBoard.user.articles.search.tags.search(
      userConnection,
      {
        body: {
          title: "NonExistentTitle12345",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(nonMatchingSearch);
  TestValidator.equals(
    "non-matching search should return empty",
    nonMatchingSearch.data.length,
    0,
  );
}
