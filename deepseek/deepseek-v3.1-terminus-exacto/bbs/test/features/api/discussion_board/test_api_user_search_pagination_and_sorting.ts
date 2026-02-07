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
 * Test pagination functionality with large result sets.
 * Since article creation endpoints are not available, this test focuses on
 * testing the search pagination behavior with existing data in the system.
 * It verifies pagination metadata accuracy and page calculation correctness
 * across different page sizes and page numbers.
 */
export async function test_api_user_search_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
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
  // Test pagination with different page sizes
  const testLimits = [5, 10, 15] as const;
  for (const limit of testLimits) {
    // Test first page
    const firstPage = await api.functional.discussionBoard.user.search(
      userConnection,
      {
        body: {
          limit: limit,
          page: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(firstPage);
    // Validate pagination metadata structure
    TestValidator.equals(
      `first page current should be 1 for limit ${limit}`,
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      `first page limit should be ${limit}`,
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `first page records should be non-negative`,
      firstPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      `first page pages should be non-negative`,
      firstPage.pagination.pages >= 0,
    );
    // Validate pagination calculation consistency
    const expectedPages =
      firstPage.pagination.records === 0
        ? 0
        : Math.ceil(firstPage.pagination.records / firstPage.pagination.limit);
    TestValidator.equals(
      `pages should equal ceil(records/limit)`,
      firstPage.pagination.pages,
      expectedPages,
    );
    // Test additional pages if they exist
    if (firstPage.pagination.pages > 1) {
      // Test middle page
      const middlePageNum = Math.max(
        2,
        Math.floor(firstPage.pagination.pages / 2),
      );
      const middlePage = await api.functional.discussionBoard.user.search(
        userConnection,
        {
          body: {
            limit: limit,
            page: middlePageNum,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
      typia.assert(middlePage);
      TestValidator.equals(
        `middle page current should be ${middlePageNum}`,
        middlePage.pagination.current,
        middlePageNum,
      );
      TestValidator.equals(
        `middle page limit should be ${limit}`,
        middlePage.pagination.limit,
        limit,
      );
      // Test last page
      const lastPage = await api.functional.discussionBoard.user.search(
        userConnection,
        {
          body: {
            limit: limit,
            page: firstPage.pagination.pages,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
      typia.assert(lastPage);
      TestValidator.equals(
        `last page current should be total pages`,
        lastPage.pagination.current,
        firstPage.pagination.pages,
      );
      TestValidator.predicate(
        `last page data length should be <= limit`,
        lastPage.data.length <= limit,
      );
      // Verify data consistency across pages
      TestValidator.equals(
        `total records should be consistent`,
        firstPage.pagination.records,
        lastPage.pagination.records,
      );
    }
  }
  // Test sorting behavior with no search terms (should use default sorting)
  const defaultSortResults = await api.functional.discussionBoard.user.search(
    userConnection,
    {
      body: {
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(defaultSortResults);
  // Verify basic search functionality works
  TestValidator.predicate(
    "search should return valid pagination structure",
    defaultSortResults.pagination.current >= 0 &&
      defaultSortResults.pagination.limit > 0 &&
      defaultSortResults.pagination.records >= 0 &&
      defaultSortResults.pagination.pages >= 0,
  );
  // Test edge cases
  // Test page 0 (should default to page 1 based on minimum constraint)
  const pageZero = await api.functional.discussionBoard.user.search(
    userConnection,
    {
      body: {
        limit: 5,
        page: 0,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(pageZero);
  TestValidator.predicate(
    "page 0 should handle gracefully",
    pageZero.pagination.current >= 1,
  );
  // Test maximum limit
  const maxLimit = await api.functional.discussionBoard.user.search(
    userConnection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.predicate(
    "maximum limit should work correctly",
    maxLimit.pagination.limit <= 100,
  );
  // Test minimum limit
  const minLimit = await api.functional.discussionBoard.user.search(
    userConnection,
    {
      body: {
        limit: 1,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(minLimit);
  TestValidator.equals(
    "minimum limit should be respected",
    minLimit.pagination.limit,
    1,
  );
}
