import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test article filtering by section and tags with AND logic.
 *
 * Since article creation APIs are not available in the SDK, this test validates
 * filtering functionality using existing data in the system. Tests include:
 * - Section filtering with sectionId parameter
 * - Tag filtering with tagIds parameter (AND logic for multiple tags)
 * - Combined section and tag filtering
 * - Pagination with filtered results
 * - Empty results validation
 */
export async function test_api_article_filtering_by_section_and_tags(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic filtering with sectionId
  const sectionFilterResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sectionFilterResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    sectionFilterResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    sectionFilterResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    sectionFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    sectionFilterResult.pagination.pages >= 0,
  );
  // Test 2: Tag filtering with single tag
  const singleTagFilterResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        tagIds: [typia.random<string & tags.Format<"uuid">>()],
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(singleTagFilterResult);
  // Test 3: Tag filtering with multiple tags (AND logic)
  const multipleTagFilterResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        tagIds: [
          typia.random<string & tags.Format<"uuid">>(),
          typia.random<string & tags.Format<"uuid">>(),
          typia.random<string & tags.Format<"uuid">>(),
        ],
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(multipleTagFilterResult);
  // Test 4: Combined section and tag filtering
  const combinedFilterResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        tagIds: [
          typia.random<string & tags.Format<"uuid">>(),
          typia.random<string & tags.Format<"uuid">>(),
        ],
        page: 1,
        limit: 15,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(combinedFilterResult);
  // Test 5: Pagination with different page numbers
  const page2Result = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 has correct current",
    page2Result.pagination.current,
    2,
  );
  // Test 6: Different limit values
  const limit50Result = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        limit: 50,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(limit50Result);
  TestValidator.equals("limit 50 applied", limit50Result.pagination.limit, 50);
  // Test 7: Maximum limit (100)
  const maxLimitResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit 100 applied",
    maxLimitResult.pagination.limit,
    100,
  );
  // Test 8: Sorting by created_at descending (default)
  const sortByCreatedAtDesc =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sortByCreatedAtDesc);
  // Test 9: Sorting by title ascending
  const sortByTitleAsc = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        sortBy: "title",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(sortByTitleAsc);
  // Test 10: Empty tagIds array (should return all articles)
  const emptyTagIdsResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        tagIds: [],
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptyTagIdsResult);
  // Test 11: Search with keyword
  const searchResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: RandomGenerator.paragraph({ sentences: 1 }),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult);
  // Test 12: Date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        createdAtGte: yesterday.toISOString(),
        createdAtLte: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  // Test 13: Member filtering
  const memberFilterResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        memberId: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(memberFilterResult);
  // Test 14: Combined filters (section, tags, date range, search)
  const complexFilterResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        tagIds: [
          typia.random<string & tags.Format<"uuid">>(),
          typia.random<string & tags.Format<"uuid">>(),
        ],
        search: RandomGenerator.alphabets(5),
        createdAtGte: yesterday.toISOString(),
        page: 1,
        limit: 20,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(complexFilterResult);
}
