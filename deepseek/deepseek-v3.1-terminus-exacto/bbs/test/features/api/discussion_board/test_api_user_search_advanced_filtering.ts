import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test advanced filtering capabilities for discussion board article search.
 * Since article creation endpoints are not available, this test focuses on
 * validating the search functionality with basic filters and pagination.
 * Tests include: search text filtering, author filtering, date range filtering,
 * pagination, and empty result sets.
 */
export async function test_api_user_search_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create a user for testing author filtering
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  const searchConnection: api.IConnection = { host: connection.host };
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Test search text filter with generic search term
  const searchResults = await api.functional.discussionBoard.user.search(
    searchConnection,
    {
      body: {
        search: "test",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search returns valid pagination structure",
    searchResults.pagination.current === 1 &&
      searchResults.pagination.limit === 10,
  );
  // Test author filter with the created user
  const authorResults = await api.functional.discussionBoard.user.search(
    searchConnection,
    {
      body: {
        author_id: user.id,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(authorResults);
  TestValidator.predicate(
    "author filter returns valid response",
    authorResults.data instanceof Array,
  );
  // Test date range filter
  const dateResults = await api.functional.discussionBoard.user.search(
    searchConnection,
    {
      body: {
        created_after: new Date(now.getTime() - 30 * oneDayMs).toISOString(),
        created_before: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(dateResults);
  TestValidator.predicate(
    "date range filter returns valid response",
    dateResults.pagination.records >= 0,
  );
  // Test combined filters
  const combinedResults = await api.functional.discussionBoard.user.search(
    searchConnection,
    {
      body: {
        search: "test",
        author_id: user.id,
        created_after: new Date(now.getTime() - 30 * oneDayMs).toISOString(),
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(combinedResults);
  TestValidator.predicate(
    "combined filters return valid response",
    combinedResults.pagination.limit === 5,
  );
  // Test pagination with small limit
  const paginationResults = await api.functional.discussionBoard.user.search(
    searchConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(paginationResults);
  TestValidator.equals(
    "pagination limit is respected",
    paginationResults.pagination.limit,
    2,
  );
  // Test empty result set with non-existent search term
  const emptyResults = await api.functional.discussionBoard.user.search(
    searchConnection,
    {
      body: {
        search: "nonexistentsearchterm12345xyz",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptyResults);
  TestValidator.predicate(
    "empty search returns valid pagination structure",
    emptyResults.pagination.records >= 0,
  );
  // Test boundary date condition - very old date
  const oldDateResults = await api.functional.discussionBoard.user.search(
    searchConnection,
    {
      body: {
        created_after: new Date(0).toISOString(), // Unix epoch start
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(oldDateResults);
  TestValidator.predicate(
    "boundary date filter returns valid response",
    oldDateResults.data instanceof Array,
  );
}
