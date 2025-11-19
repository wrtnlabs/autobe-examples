import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";

/**
 * Test post search pagination functionality with various limit values and page
 * numbers
 *
 * Validates that the system correctly handles minimum and maximum page limits
 * (1-100), respects pagination boundaries, and returns appropriate pagination
 * metadata. Tests edge cases including requesting pages beyond total available
 * records.
 */
export async function test_api_posts_search_pagination_limits(
  connection: api.IConnection,
) {
  // Test minimum limit (1 item per page)
  const result1 = await api.functional.posts.index(connection, {
    body: {
      page: 1,
      limit: 1,
    } satisfies IDiscussionBoardPost.IRequest,
  });
  typia.assert(result1);
  TestValidator.equals("minimum limit pagination", result1.pagination.limit, 1);
  TestValidator.predicate(
    "minimum limit current page is 1",
    result1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "minimum limit total records non-negative",
    result1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "minimum limit total pages non-negative",
    result1.pagination.pages >= 0,
  );

  // Test maximum limit (100 items per page)
  const result2 = await api.functional.posts.index(connection, {
    body: {
      page: 1,
      limit: 100,
    } satisfies IDiscussionBoardPost.IRequest,
  });
  typia.assert(result2);
  TestValidator.equals(
    "maximum limit pagination",
    result2.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "maximum limit current page is 1",
    result2.pagination.current >= 1,
  );
  TestValidator.predicate(
    "maximum limit total records non-negative",
    result2.pagination.records >= 0,
  );
  TestValidator.predicate(
    "maximum limit total pages non-negative",
    result2.pagination.pages >= 0,
  );

  // Test typical limit (20 items per page)
  const result3 = await api.functional.posts.index(connection, {
    body: {
      page: 1,
      limit: 20,
    } satisfies IDiscussionBoardPost.IRequest,
  });
  typia.assert(result3);
  TestValidator.equals(
    "typical limit pagination",
    result3.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "typical limit current page is 1",
    result3.pagination.current >= 1,
  );
  TestValidator.predicate(
    "typical limit total records non-negative",
    result3.pagination.records >= 0,
  );
  TestValidator.predicate(
    "typical limit total pages non-negative",
    result3.pagination.pages >= 0,
  );

  // Test pagination calculation consistency
  if (result3.pagination.records > 0) {
    const expectedPages = Math.ceil(
      result3.pagination.records / result3.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation",
      result3.pagination.pages,
      expectedPages,
    );
  }

  // Test different page numbers if there are multiple pages
  if (result3.pagination.pages > 1) {
    const result4 = await api.functional.posts.index(connection, {
      body: {
        page: 2,
        limit: 20,
      } satisfies IDiscussionBoardPost.IRequest,
    });
    typia.assert(result4);
    TestValidator.equals("page 2 current page", result4.pagination.current, 2);
    TestValidator.equals(
      "page 2 limit consistency",
      result4.pagination.limit,
      20,
    );
    TestValidator.equals(
      "page 2 total records consistency",
      result4.pagination.records,
      result3.pagination.records,
    );
    TestValidator.equals(
      "page 2 total pages consistency",
      result4.pagination.pages,
      result3.pagination.pages,
    );
  }

  // Test page beyond total pages (should return empty data but valid pagination)
  const largePage = result3.pagination.pages + 10;
  const result5 = await api.functional.posts.index(connection, {
    body: {
      page: largePage,
      limit: 20,
    } satisfies IDiscussionBoardPost.IRequest,
  });
  typia.assert(result5);
  TestValidator.equals(
    "beyond total pages current page",
    result5.pagination.current,
    largePage,
  );
  TestValidator.equals(
    "beyond total pages limit consistency",
    result5.pagination.limit,
    20,
  );
  TestValidator.equals(
    "beyond total pages total records consistency",
    result5.pagination.records,
    result3.pagination.records,
  );
  TestValidator.equals(
    "beyond total pages total pages consistency",
    result5.pagination.pages,
    result3.pagination.pages,
  );
  TestValidator.predicate(
    "beyond total pages should have empty data",
    result5.data.length === 0,
  );

  // Test data structure consistency
  if (result3.data.length > 0) {
    const firstItem = result3.data[0];
    typia.assert(firstItem);
    TestValidator.predicate(
      "data item has id",
      typeof firstItem.id === "string" && firstItem.id.length > 0,
    );
    TestValidator.predicate(
      "data item has type",
      typeof firstItem.type === "string" && firstItem.type.length > 0,
    );
    TestValidator.predicate(
      "data item has title",
      typeof firstItem.title === "string" && firstItem.title.length > 0,
    );
  }
}
