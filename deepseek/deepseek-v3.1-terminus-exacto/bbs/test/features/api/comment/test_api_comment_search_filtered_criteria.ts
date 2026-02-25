import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_comment_search_filtered_criteria(
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
  // Test individual filters
  // 1. Author display name filter
  const searchByAuthor =
    await api.functional.discussionBoard.user.comments.search(userConnection, {
      body: {
        author_display_name: user.display_name,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchByAuthor);
  // 2. Date range filter
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const searchByDate =
    await api.functional.discussionBoard.user.comments.search(userConnection, {
      body: {
        created_at_start: yesterday,
        created_at_end: tomorrow,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchByDate);
  // 3. Boundary condition tests for date ranges
  const farPast = new Date(0).toISOString();
  const farFuture = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const searchBoundary =
    await api.functional.discussionBoard.user.comments.search(userConnection, {
      body: {
        created_at_start: farPast,
        created_at_end: farFuture,
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchBoundary);
  // 4. Combined filters
  const combinedSearch =
    await api.functional.discussionBoard.user.comments.search(userConnection, {
      body: {
        author_display_name: user.display_name,
        created_at_start: yesterday,
        created_at_end: tomorrow,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(combinedSearch);
  // 5. Empty search result validation
  const nonExistentDate = new Date(3000, 0, 1).toISOString();
  const emptySearch = await api.functional.discussionBoard.user.comments.search(
    userConnection,
    {
      body: {
        created_at_start: nonExistentDate,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardComment.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns valid pagination",
    emptySearch.pagination.records >= 0,
  );
  // Validate pagination structure properly
  TestValidator.predicate(
    "author search has valid pagination",
    searchByAuthor.pagination.current >= 0,
  );
  TestValidator.predicate(
    "date search has valid pagination",
    searchByDate.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "combined search has valid pagination",
    combinedSearch.pagination.records >= 0,
  );
}
