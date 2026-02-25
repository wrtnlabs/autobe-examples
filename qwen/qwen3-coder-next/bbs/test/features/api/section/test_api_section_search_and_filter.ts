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

export async function test_api_section_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic listing with default pagination
  const defaultResponse = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // Test 2: Search functionality
  const searchResponse = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: "technology",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Test 3: Filter by section IDs (use non-empty array)
  const sectionIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const filteredResponse = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        sectionIds,
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(filteredResponse);
  // Test 4: Sorting by newest
  const newestResponse = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        sortBy: "newest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(newestResponse);
  // Test 5: Sorting by oldest
  const oldestResponse = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        sortBy: "oldest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(oldestResponse);
  // Test 6: Pagination metadata validation
  TestValidator.equals(
    "pagination has current",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    defaultResponse.pagination.pages >= 0,
  );
  // Test 7: Empty search returns empty data array
  const emptySearchResponse =
    await api.functional.discussionBoard.sections.index(connection, {
      body: {
        search: "nonexistentsectionname12345",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(emptySearchResponse);
  TestValidator.equals(
    "empty search returns empty data",
    emptySearchResponse.data.length,
    0,
  );
  // Test 8: Combined search, filtering, and sorting
  const combinedResponse = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: "general",
        sectionIds: [typia.random<string & tags.Format<"uuid">>()],
        sortBy: "newest",
        page: 1,
        limit: 15,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(combinedResponse);
  // Test 9: Boundary conditions - page 0 (should default to 1)
  const zeroPageResponse = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        page: 0,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(zeroPageResponse);
  // Test 10: Boundary conditions - limit 100 (max)
  const maxLimitResponse = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(maxLimitResponse);
  // Test 11: Verify response structure
  TestValidator.predicate(
    "response has pagination",
    defaultResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(defaultResponse.data),
  );
  // Test 12: Verify section summary structure
  if (defaultResponse.data.length > 0) {
    const firstSection = defaultResponse.data[0];
    typia.assert<IDiscussionBoardSection.ISummary>(firstSection);
    TestValidator.equals(
      "section has id type",
      typeof firstSection.id,
      "string",
    );
    TestValidator.equals(
      "section has name type",
      typeof firstSection.name,
      "string",
    );
  }
}
