import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDateRange";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test the pagination functionality of the password reset search endpoint with various boundary conditions.
 * Create multiple password reset requests by registering multiple users to generate sufficient data.
 * Test pagination with page numbers at the beginning, middle, and end of result sets, including edge cases
 * like requesting pages beyond the total available pages. Validate that pagination metadata (current page,
 * limit, total records, total pages) is accurate and consistent across all pages. Verify that the limit
 * parameter respects the maximum value constraint of 100 records per page and that out-of-bound page
 * requests return appropriate empty results.
 */
export async function test_api_user_password_reset_search_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple users to generate password reset data
  const userCount = 15; // Create enough users to test pagination
  const users: api.IConnection[] = [];
  for (let i = 0; i < userCount; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    users.push(userConnection);
  }
  // Use the first user's connection for searching (assuming it has appropriate permissions)
  const searchConnection = users[0];
  // Test pagination with different limit values
  const testLimits = [5, 10, 20]; // Test various page sizes
  for (const limit of testLimits) {
    // Test first page
    const firstPage =
      await api.functional.discussionBoard.user.password_resets.index(
        searchConnection,
        {
          body: {
            page: 1,
            limit: limit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100> as number,
          } satisfies IDiscussionBoardUserPasswordReset.IRequest,
        },
      );
    typia.assert(firstPage);
    TestValidator.equals(
      "first page current page",
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals("first page limit", firstPage.pagination.limit, limit);
    TestValidator.predicate(
      "first page has records",
      firstPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      "first page has pages",
      firstPage.pagination.pages >= 0,
    );
    // Test middle page if available
    if (firstPage.pagination.pages > 2) {
      const middlePageNum = Math.floor(firstPage.pagination.pages / 2);
      const middlePage =
        await api.functional.discussionBoard.user.password_resets.index(
          searchConnection,
          {
            body: {
              page: middlePageNum satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<1> as number,
              limit: limit satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<100> as number,
            } satisfies IDiscussionBoardUserPasswordReset.IRequest,
          },
        );
      typia.assert(middlePage);
      TestValidator.equals(
        "middle page current page",
        middlePage.pagination.current,
        middlePageNum,
      );
      TestValidator.equals(
        "middle page limit",
        middlePage.pagination.limit,
        limit,
      );
      TestValidator.equals(
        "middle page total records",
        middlePage.pagination.records,
        firstPage.pagination.records,
      );
      TestValidator.equals(
        "middle page total pages",
        middlePage.pagination.pages,
        firstPage.pagination.pages,
      );
    }
    // Test last page
    if (firstPage.pagination.pages > 1) {
      const lastPage =
        await api.functional.discussionBoard.user.password_resets.index(
          searchConnection,
          {
            body: {
              page: firstPage.pagination.pages satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<1> as number,
              limit: limit satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<100> as number,
            } satisfies IDiscussionBoardUserPasswordReset.IRequest,
          },
        );
      typia.assert(lastPage);
      TestValidator.equals(
        "last page current page",
        lastPage.pagination.current,
        firstPage.pagination.pages,
      );
      TestValidator.equals("last page limit", lastPage.pagination.limit, limit);
      TestValidator.equals(
        "last page total records",
        lastPage.pagination.records,
        firstPage.pagination.records,
      );
      TestValidator.equals(
        "last page total pages",
        lastPage.pagination.pages,
        firstPage.pagination.pages,
      );
    }
    // Test page beyond total pages (should return empty data)
    const beyondPage =
      await api.functional.discussionBoard.user.password_resets.index(
        searchConnection,
        {
          body: {
            page: (firstPage.pagination.pages + 1) satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> as number,
            limit: limit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100> as number,
          } satisfies IDiscussionBoardUserPasswordReset.IRequest,
        },
      );
    typia.assert(beyondPage);
    TestValidator.equals(
      "beyond page current page",
      beyondPage.pagination.current,
      firstPage.pagination.pages + 1,
    );
    TestValidator.equals(
      "beyond page limit",
      beyondPage.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "beyond page total records",
      beyondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "beyond page total pages",
      beyondPage.pagination.pages,
      firstPage.pagination.pages,
    );
    TestValidator.equals("beyond page data empty", beyondPage.data.length, 0);
  }
  // Test maximum limit constraint
  const maxLimitPage =
    await api.functional.discussionBoard.user.password_resets.index(
      searchConnection,
      {
        body: {
          page: 1,
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page limit",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit page data count <= 100",
    maxLimitPage.data.length <= 100,
  );
  // Test minimum page number
  const minPage =
    await api.functional.discussionBoard.user.password_resets.index(
      searchConnection,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(minPage);
  TestValidator.equals("min page current page", minPage.pagination.current, 1);
}
