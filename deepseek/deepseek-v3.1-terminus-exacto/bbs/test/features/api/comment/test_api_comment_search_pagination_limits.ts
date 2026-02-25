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

export async function test_api_comment_search_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Test pagination with various configurations
  const testCases = [
    { page: 1, limit: 10 }, // Basic case
    { page: 1, limit: 50 }, // Medium limit
    { page: 1, limit: 100 }, // Maximum limit
    { page: 2, limit: 25 }, // Non-first page
    { page: 5, limit: 20 }, // Higher page number
    { page: 1, limit: 150 }, // Oversized limit (should clamp to 100)
  ] as const;
  for (const testCase of testCases) {
    // Ensure valid page number (minimum 1)
    const validPage = Math.max(1, testCase.page);
    const validLimit = Math.min(100, Math.max(1, testCase.limit));
    const searchResult =
      await api.functional.discussionBoard.user.comments.search(
        userConnection,
        {
          body: {
            page: validPage satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            limit: validLimit satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IDiscussionBoardComment.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate pagination metadata
    TestValidator.equals(
      `pagination current page for page=${testCase.page}, limit=${testCase.limit}`,
      searchResult.pagination.current,
      validPage,
    );
    TestValidator.equals(
      `pagination limit for page=${testCase.page}, limit=${testCase.limit}`,
      searchResult.pagination.limit,
      validLimit,
    );
    TestValidator.predicate(
      `pagination records non-negative for page=${testCase.page}, limit=${testCase.limit}`,
      searchResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination pages non-negative for page=${testCase.page}, limit=${testCase.limit}`,
      searchResult.pagination.pages >= 0,
    );
    // Validate data array size does not exceed limit
    TestValidator.predicate(
      `data array size <= limit for page=${testCase.page}, limit=${testCase.limit}`,
      searchResult.data.length <= searchResult.pagination.limit,
    );
    // Validate pagination calculations
    const expectedPages =
      searchResult.pagination.records === 0
        ? 0
        : Math.ceil(
            searchResult.pagination.records / searchResult.pagination.limit,
          );
    TestValidator.equals(
      `pagination pages calculation for page=${testCase.page}, limit=${testCase.limit}`,
      searchResult.pagination.pages,
      expectedPages,
    );
  }
  // Test empty search with specific criteria
  const emptySearchResult =
    await api.functional.discussionBoard.user.comments.search(userConnection, {
      body: {
        search: "nonexistent_search_term_that_will_not_match_anything",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(emptySearchResult);
  // Validate empty result set pagination
  TestValidator.equals(
    "empty search records count",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pages count",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search data array",
    emptySearchResult.data.length,
    0,
  );
}
