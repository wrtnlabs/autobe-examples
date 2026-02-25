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

/**
 * Test basic comment search functionality using keyword matching.
 * 1. Create user account via join endpoint
 * 2. Perform search operation with specific keywords
 * 3. Verify response includes paginated results with comment summaries
 * 4. Validate matching content and author information
 */
export async function test_api_comment_search_basic_keyword(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate via join
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Perform search operation with basic keyword
  const searchBody = {
    search: RandomGenerator.paragraph({ sentences: 1, wordMin: 1, wordMax: 3 }),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardComment.IRequest;
  const searchResult =
    await api.functional.discussionBoard.user.comments.search(userConnection, {
      body: searchBody,
    });
  typia.assert(searchResult);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchResult.pagination.pages >= 0,
  );
  // 4. Validate each comment in results
  for (const comment of searchResult.data) {
    typia.assert(comment);
    TestValidator.predicate(
      "comment has valid content",
      comment.content.length > 0,
    );
    TestValidator.predicate("comment has author info", Boolean(comment.author));
    TestValidator.equals(
      "author has valid display name",
      typeof comment.author.display_name,
      "string",
    );
    TestValidator.predicate(
      "created at timestamp valid",
      Boolean(comment.created_at),
    );
    TestValidator.predicate(
      "updated at timestamp valid",
      Boolean(comment.updated_at),
    );
  }
}
