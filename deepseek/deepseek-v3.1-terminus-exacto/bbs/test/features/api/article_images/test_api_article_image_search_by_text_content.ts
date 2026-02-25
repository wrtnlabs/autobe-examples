import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
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

export async function test_api_article_image_search_by_text_content(
  connection: api.IConnection,
): Promise<void> {
  // Setup user connection and create article
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: undefined,
  });
  typia.assert(authorized);
  // Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    { body: undefined },
  );
  typia.assert(article);
  // Note: Actual image attachment functionality is not available in current API
  // This test will focus on validating the search endpoint structure and basic functionality
  // with available data and error scenarios
  // Test 1: Basic search with empty criteria (should return default results)
  const emptySearch =
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns valid pagination structure",
    emptySearch.pagination.current >= 1 && emptySearch.pagination.limit > 0,
  );
  // Test 2: Search with alt_text parameter format validation
  const altTextSearch =
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          alt_text: "test",
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(altTextSearch);
  TestValidator.predicate(
    "alt_text search returns valid response",
    Array.isArray(altTextSearch.data),
  );
  // Test 3: Search with caption parameter
  const captionSearch =
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          caption: "caption",
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(captionSearch);
  TestValidator.predicate(
    "caption search returns valid response",
    Array.isArray(captionSearch.data),
  );
  // Test 4: Combined search parameters
  const combinedSearch =
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          alt_text: "test",
          caption: "test",
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined search returns valid response",
    Array.isArray(combinedSearch.data),
  );
  // Test 5: Pagination parameters
  const paginatedSearch =
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination returns correct page",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination returns correct limit",
    paginatedSearch.pagination.limit,
    10,
  );
  // Test 6: Authorization boundary - attempt to access non-existent article
  await TestValidator.error(
    "accessing non-existent article should fail",
    async () => {
      await api.functional.discussionBoard.user.articles.images.index(
        userConnection,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IDiscussionBoardArticleFile.IRequest,
        },
      );
    },
  );
  // Test 7: Edge case - empty string search parameters
  const emptyStringSearch =
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          alt_text: "",
          caption: "",
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(emptyStringSearch);
  TestValidator.predicate(
    "empty string search returns valid response",
    Array.isArray(emptyStringSearch.data),
  );
}
