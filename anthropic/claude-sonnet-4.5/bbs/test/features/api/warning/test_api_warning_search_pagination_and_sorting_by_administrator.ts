import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardWarning";

/**
 * Test the pagination and sorting capabilities of the warning search endpoint.
 *
 * This test validates that administrators can efficiently navigate and organize
 * warning data through multiple sorting options and proper pagination
 * controls.
 *
 * Test Steps:
 *
 * 1. Administrator authenticates by joining the system
 * 2. Test basic pagination with page size of 10
 * 3. Verify pagination metadata correctness (current page, limit, records, pages)
 * 4. Navigate to second page and verify continuity (if multiple pages exist)
 * 5. Test sorting by created_at in ascending order
 * 6. Test sorting by created_at in descending order
 * 7. Test sorting by warning_level
 * 8. Test combined pagination with sorting
 */
export async function test_api_warning_search_pagination_and_sorting_by_administrator(
  connection: api.IConnection,
) {
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCredentials,
  });
  typia.assert(admin);

  const firstPageLimit = 10;
  const firstPageResult =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: firstPageLimit,
        } satisfies IDiscussionBoardWarning.IRequest,
      },
    );
  typia.assert(firstPageResult);

  TestValidator.equals(
    "first page current page number",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit",
    firstPageResult.pagination.limit,
    firstPageLimit,
  );
  TestValidator.predicate(
    "first page data count should be at most limit",
    firstPageResult.data.length <= firstPageLimit,
  );
  TestValidator.predicate(
    "pagination pages calculation should be correct",
    firstPageResult.pagination.pages ===
      Math.ceil(
        firstPageResult.pagination.records / firstPageResult.pagination.limit,
      ),
  );

  if (firstPageResult.pagination.pages > 1) {
    const secondPageResult =
      await api.functional.discussionBoard.administrator.warnings.index(
        connection,
        {
          body: {
            page: 2,
            limit: firstPageLimit,
          } satisfies IDiscussionBoardWarning.IRequest,
        },
      );
    typia.assert(secondPageResult);

    TestValidator.equals(
      "second page current page number",
      secondPageResult.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination records should match across pages",
      secondPageResult.pagination.records,
      firstPageResult.pagination.records,
    );
  }

  const sortedAscResult =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardWarning.IRequest,
      },
    );
  typia.assert(sortedAscResult);

  if (sortedAscResult.data.length > 1) {
    for (let i = 0; i < sortedAscResult.data.length - 1; i++) {
      const currentDate = new Date(sortedAscResult.data[i].created_at);
      const nextDate = new Date(sortedAscResult.data[i + 1].created_at);
      TestValidator.predicate(
        "ascending sort by created_at order verification",
        currentDate.getTime() <= nextDate.getTime(),
      );
    }
  }

  const sortedDescResult =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardWarning.IRequest,
      },
    );
  typia.assert(sortedDescResult);

  if (sortedDescResult.data.length > 1) {
    for (let i = 0; i < sortedDescResult.data.length - 1; i++) {
      const currentDate = new Date(sortedDescResult.data[i].created_at);
      const nextDate = new Date(sortedDescResult.data[i + 1].created_at);
      TestValidator.predicate(
        "descending sort by created_at order verification",
        currentDate.getTime() >= nextDate.getTime(),
      );
    }
  }

  const sortedByLevelResult =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      {
        body: {
          sort_by: "warning_level",
          sort_order: "asc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardWarning.IRequest,
      },
    );
  typia.assert(sortedByLevelResult);

  const combinedResult =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      {
        body: {
          sort_by: "warning_level",
          sort_order: "desc",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardWarning.IRequest,
      },
    );
  typia.assert(combinedResult);

  TestValidator.equals(
    "combined pagination and sorting limit",
    combinedResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "combined result data count should not exceed limit",
    combinedResult.data.length <= 5,
  );
}
