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

export async function test_api_tag_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic pagination with page 1, limit 10
  const page1Result = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(page1Result);
  // Verify pagination metadata for page 1
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 10);
  // Verify data count (should be 10 or fewer if total tags < 10)
  if (page1Result.pagination.records >= 10) {
    TestValidator.equals("page 1 data count", page1Result.data.length, 10);
  }
  // Test 2: Page 2 should have different tags than page 1
  const page2Result = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  // Verify page 2 has different tags if there are enough records
  if (page1Result.data.length > 0 && page2Result.data.length > 0) {
    const page1Ids = new Set(page1Result.data.map((tag) => tag.id));
    const page2HasDifferentTags = page2Result.data.every(
      (tag) => !page1Ids.has(tag.id),
    );
    TestValidator.predicate("page 2 has different tags", page2HasDifferentTags);
  }
  // Test 3: Page beyond available data (page 999) should return empty results
  const beyondPageResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 999,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond page current",
    beyondPageResult.pagination.current,
    999,
  );
  TestValidator.equals(
    "beyond page data empty",
    beyondPageResult.data.length,
    0,
  );
  // Test 4: Limit capped at maximum 100
  const maxLimitResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.equals("max limit value", maxLimitResult.pagination.limit, 100);
  // Test 5: Minimum limit of 1
  const minLimitResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(minLimitResult);
  TestValidator.equals("min limit value", minLimitResult.pagination.limit, 1);
  if (minLimitResult.pagination.records > 0) {
    TestValidator.equals("min limit data count", minLimitResult.data.length, 1);
  }
  // Test 6: Verify pagination metadata consistency
  TestValidator.predicate(
    "total records consistent across pages",
    page1Result.pagination.records === page2Result.pagination.records &&
      page1Result.pagination.records === beyondPageResult.pagination.records,
  );
  // Verify pages calculation is correct
  const expectedPages = Math.ceil(
    page1Result.pagination.records / page1Result.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation",
    page1Result.pagination.pages,
    expectedPages,
  );
}
