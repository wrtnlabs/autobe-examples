import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test pagination boundary behavior for tag listing endpoint.
 *
 * Tests various pagination scenarios including:
 * - Small page sizes (limit=5)
 * - Maximum allowed limit (limit=100)
 * - Limits exceeding maximum (limit=150, should be clamped to 100)
 * - Page navigation
 * - Out-of-bounds page requests
 * - Pagination metadata accuracy
 */
export async function test_api_tag_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test with limit=5 (small page size)
  const page1 = await api.functional.discussionBoard.tags.index(connection, {
    body: { limit: 5 } satisfies IDiscussionBoardTag.IRequest,
  });
  typia.assert(page1);
  TestValidator.predicate(
    "limit=5 returns at most 5 tags",
    page1.data.length <= 5,
  );
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 5", page1.pagination.limit, 5);
  TestValidator.predicate(
    "records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate("pages is non-negative", page1.pagination.pages >= 0);
  // 2. Request page 2 with same limit to verify pagination
  const page2 = await api.functional.discussionBoard.tags.index(connection, {
    body: { limit: 5, page: 2 } satisfies IDiscussionBoardTag.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.equals(
    "total records consistent across pages",
    page1.pagination.records,
    page2.pagination.records,
  );
  // If there are enough records, verify we get different data
  if (page1.pagination.records > 5) {
    TestValidator.notEquals(
      "page 2 has different tags",
      page1.data[0]?.id,
      page2.data[0]?.id,
    );
  }
  // 3. Test maximum limit boundary (limit=100)
  const maxLimitPage = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: { limit: 100 } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.predicate(
    "limit=100 returns at most 100 tags",
    maxLimitPage.data.length <= 100,
  );
  TestValidator.equals("limit is 100", maxLimitPage.pagination.limit, 100);
  // 4. Test limit exceeding maximum (limit=150 should be clamped to 100)
  const exceededLimitPage = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: { limit: 150 } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(exceededLimitPage);
  TestValidator.predicate(
    "limit=150 returns at most 100 tags",
    exceededLimitPage.data.length <= 100,
  );
  TestValidator.equals(
    "limit clamped to 100",
    exceededLimitPage.pagination.limit,
    100,
  );
  // 5. Verify total records consistency across different limit values
  TestValidator.equals(
    "records consistent with max limit",
    page1.pagination.records,
    maxLimitPage.pagination.records,
  );
  // 6. Test out-of-bounds page request (should return empty data with correct metadata)
  const outOfBoundsPage = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: { limit: 10, page: 10000 } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(outOfBoundsPage);
  TestValidator.equals(
    "out-of-bounds returns empty data",
    outOfBoundsPage.data.length,
    0,
  );
  TestValidator.equals(
    "records still shows total",
    outOfBoundsPage.pagination.records,
    page1.pagination.records,
  );
  TestValidator.predicate(
    "out-of-bounds current page matches request",
    outOfBoundsPage.pagination.current === 10000,
  );
}
