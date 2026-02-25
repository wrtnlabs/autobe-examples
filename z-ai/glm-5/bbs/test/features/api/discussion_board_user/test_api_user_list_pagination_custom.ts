import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_list_pagination_custom(
  connection: api.IConnection,
): Promise<void> {
  // 1. Get initial data to understand total count
  const firstPage = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(firstPage);
  // 2. Test custom page and limit parameters
  const customPage = 2;
  const customLimit = 5;
  const paginatedResult = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        page: customPage,
        limit: customLimit,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "current page matches requested",
    paginatedResult.pagination.current,
    customPage,
  );
  TestValidator.equals(
    "limit matches requested",
    paginatedResult.pagination.limit,
    customLimit,
  );
  // 3. Test maximum allowed limit (100 records)
  const maxLimit = 100;
  const maxLimitResult = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        limit: maxLimit,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit correctly applied",
    maxLimitResult.pagination.limit,
    maxLimit,
  );
  // 4. Test requesting a page beyond available data
  const totalPages = firstPage.pagination.pages;
  const beyondPage = totalPages === 0 ? 2 : totalPages + 1;
  const beyondResult = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        page: beyondPage,
        limit: 10,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(beyondResult);
  TestValidator.equals(
    "data array is empty for out-of-range page",
    beyondResult.data.length,
    0,
  );
  TestValidator.equals(
    "current page reflects requested page",
    beyondResult.pagination.current,
    beyondPage,
  );
  TestValidator.equals(
    "records count is consistent",
    beyondResult.pagination.records,
    firstPage.pagination.records,
  );
  // 5. Verify pagination metadata consistency
  TestValidator.predicate(
    "pages count calculated correctly",
    firstPage.pagination.pages ===
      Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  // 6. Test first page with specific limit
  const firstPageLimit = 3;
  const firstPageResult = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: firstPageLimit,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(firstPageResult);
  TestValidator.equals(
    "first page current is 1",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit matches",
    firstPageResult.pagination.limit,
    firstPageLimit,
  );
}
