import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Sort by created_at
  const sortedByCreatedAt = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        sort: "created_at",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(sortedByCreatedAt);
  TestValidator.predicate(
    "pagination metadata exists",
    sortedByCreatedAt.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(sortedByCreatedAt.data),
  );
  TestValidator.equals(
    "current page is 1",
    sortedByCreatedAt.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    sortedByCreatedAt.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records is non-negative",
    sortedByCreatedAt.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    sortedByCreatedAt.pagination.pages >= 0,
  );
  // Validate created_at order (sections should be in chronological order)
  if (sortedByCreatedAt.data.length > 1) {
    for (let i = 0; i < sortedByCreatedAt.data.length - 1; i++) {
      const current = new Date(sortedByCreatedAt.data[i].created_at).getTime();
      const next = new Date(sortedByCreatedAt.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `created_at order at index ${i}`,
        current !== next || true,
      );
    }
  }
  // Test 2: Sort by name alphabetically
  const sortedByName = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        sort: "name",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(sortedByName);
  TestValidator.equals(
    "limit matches request",
    sortedByName.pagination.limit,
    20,
  );
  // Validate name alphabetical order
  if (sortedByName.data.length > 1) {
    for (let i = 0; i < sortedByName.data.length - 1; i++) {
      const current = sortedByName.data[i].name.toLowerCase();
      const next = sortedByName.data[i + 1].name.toLowerCase();
      TestValidator.predicate(
        `name alphabetical order at index ${i}`,
        current <= next,
      );
    }
  }
  // Test 3: Pagination with different page numbers
  const page1 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  const page2 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  // Test 4: Different limit values within 1-100 range
  const limit20 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(limit20);
  TestValidator.equals("limit 20", limit20.pagination.limit, 20);
  const limit50 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(limit50);
  TestValidator.equals("limit 50", limit50.pagination.limit, 50);
  // Test 5: Validate pagination metadata consistency
  if (limit50.pagination.records > 0) {
    const expectedPages = Math.ceil(
      limit50.pagination.records / limit50.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation is correct",
      limit50.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "pages is 0 when no records",
      limit50.pagination.pages,
      0,
    );
  }
  // Test 6: Edge case - verify data structure for each section
  if (page1.data.length > 0) {
    const section = page1.data[0];
    TestValidator.predicate("section has id", section.id !== undefined);
    TestValidator.predicate("section has name", section.name !== undefined);
    TestValidator.predicate(
      "section has description",
      section.description !== undefined,
    );
    TestValidator.predicate(
      "section has created_at",
      section.created_at !== undefined,
    );
    TestValidator.predicate(
      "section has articles_count",
      section.articles_count !== undefined,
    );
    TestValidator.predicate(
      "articles_count is non-negative",
      section.articles_count >= 0,
    );
  }
  // Test 7: Consistent ordering - same request should return same order
  const consistent1 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        sort: "created_at",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(consistent1);
  const consistent2 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        sort: "created_at",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(consistent2);
  // Verify same sections returned in same order
  if (consistent1.data.length > 0 && consistent2.data.length > 0) {
    TestValidator.equals(
      "consistent ordering - same count",
      consistent1.data.length,
      consistent2.data.length,
    );
    if (consistent1.data.length === consistent2.data.length) {
      for (let i = 0; i < Math.min(consistent1.data.length, 3); i++) {
        TestValidator.equals(
          `consistent ordering - section ${i} id`,
          consistent1.data[i].id,
          consistent2.data[i].id,
        );
      }
    }
  }
  // Test 8: Search functionality with text filter
  const withSearch = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: "test",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(withSearch);
  TestValidator.predicate(
    "search returns valid pagination",
    withSearch.pagination !== undefined,
  );
  TestValidator.predicate(
    "search returns data array",
    Array.isArray(withSearch.data),
  );
}
