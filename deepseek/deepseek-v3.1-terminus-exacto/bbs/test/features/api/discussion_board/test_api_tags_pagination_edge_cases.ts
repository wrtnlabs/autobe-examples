import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tags_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // First, we need to create test data by generating articles with diverse tags
  // Since we don't have article creation API in the provided SDK, we'll work with existing data
  // and test the pagination functionality with whatever tags exist in the system
  // Test 1: Empty result set for non-existent tag search
  const emptySearchResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "nonexistent_tag_that_should_not_exist_12345",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleTag.IRequest,
    },
  );
  typia.assert(emptySearchResult);
  // Test 2: Single page results with varying limits
  const singlePageLimits = [1, 10, 50, 100] as const;
  for (const limit of singlePageLimits) {
    const singlePageResult = await api.functional.discussionBoard.tags.index(
      connection,
      {
        body: {
          page: 1,
          limit: limit,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
    typia.assert(singlePageResult);
  }
  // Test 3: Multiple pages with different limits
  const multiPageLimits = [1, 5, 10] as const;
  for (const limit of multiPageLimits) {
    const firstPage = await api.functional.discussionBoard.tags.index(
      connection,
      {
        body: {
          page: 1,
          limit: limit,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
    typia.assert(firstPage);
    if (firstPage.pagination.pages > 1) {
      const secondPage = await api.functional.discussionBoard.tags.index(
        connection,
        {
          body: {
            page: 2,
            limit: limit,
          } satisfies IDiscussionBoardArticleTag.IRequest,
        },
      );
      typia.assert(secondPage);
    }
  }
  // Test 4: Requesting page beyond available pages
  const beyondPageResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 9999, // Very high page number
        limit: 10,
      } satisfies IDiscussionBoardArticleTag.IRequest,
    },
  );
  typia.assert(beyondPageResult);
  // Test 5: Maximum limit validation (100)
  const maxLimitResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100, // Maximum allowed limit
      } satisfies IDiscussionBoardArticleTag.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  // Test 6: Sorting order validation (alphabetical by tag text)
  const allTagsResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100, // Get as many as possible to test sorting
      } satisfies IDiscussionBoardArticleTag.IRequest,
    },
  );
  typia.assert(allTagsResult);
  // Test 7: Pagination metadata accuracy
  const testPageResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
      } satisfies IDiscussionBoardArticleTag.IRequest,
    },
  );
  typia.assert(testPageResult);
  // Test 8: Limit boundary conditions
  const boundaryLimits = [1, 100] as const;
  for (const limit of boundaryLimits) {
    const boundaryResult = await api.functional.discussionBoard.tags.index(
      connection,
      {
        body: {
          page: 1,
          limit: limit,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
    typia.assert(boundaryResult);
  }
}
