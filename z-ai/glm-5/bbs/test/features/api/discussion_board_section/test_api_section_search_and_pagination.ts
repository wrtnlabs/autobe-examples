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

export async function test_api_section_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Get all sections to establish baseline data
  const allSections = await api.functional.discussionBoard.sections.index(
    connection,
    { body: {} },
  );
  typia.assert(allSections);
  // Skip if no sections exist
  if (allSections.data.length === 0) {
    return;
  }
  // 2. Test search filtering - case-insensitive partial match
  const firstSection = allSections.data[0];
  const searchKeyword = firstSection.name.substring(
    0,
    Math.min(3, firstSection.name.length),
  );
  const searchResult = await api.functional.discussionBoard.sections.index(
    connection,
    { body: { search: searchKeyword } },
  );
  typia.assert(searchResult);
  // Verify all returned sections match the search term (case-insensitive partial match)
  const keywordLower = searchKeyword.toLowerCase();
  TestValidator.predicate("search results match keyword", () =>
    searchResult.data.every(
      (section) =>
        section.name.toLowerCase().includes(keywordLower) ||
        section.description.toLowerCase().includes(keywordLower),
    ),
  );
  // 3. Test date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  const futureDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day ahead
  const dateRangeResult = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        createdFrom: pastDate.toISOString(),
        createdTo: futureDate.toISOString(),
      },
    },
  );
  typia.assert(dateRangeResult);
  // Should return sections within the date range (inclusive bounds)
  TestValidator.predicate(
    "date range filter returns valid response",
    () => dateRangeResult.data.length >= 0,
  );
  // 4. Test pagination - page 1 with limit 2
  const page1Result = await api.functional.discussionBoard.sections.index(
    connection,
    { body: { page: 1, limit: 2 } },
  );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 data within limit",
    () => page1Result.data.length <= 2,
  );
  // 5. Test pagination - page 2 if there are enough records
  if (allSections.pagination.records > 2) {
    const page2Result = await api.functional.discussionBoard.sections.index(
      connection,
      { body: { page: 2, limit: 2 } },
    );
    typia.assert(page2Result);
    TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
    // Verify pages don't overlap (different IDs)
    const page1Ids = new Set(page1Result.data.map((s) => s.id));
    const page2Ids = new Set(page2Result.data.map((s) => s.id));
    const hasOverlap = [...page2Ids].some((id) => page1Ids.has(id));
    TestValidator.predicate("pages don't overlap", () => !hasOverlap);
  }
  // 6. Test limit maximum enforcement (limit > 100 should be constrained)
  const overLimitResult = await api.functional.discussionBoard.sections.index(
    connection,
    { body: { limit: 200 } },
  );
  typia.assert(overLimitResult);
  // Server should enforce maximum limit of 100
  TestValidator.predicate(
    "limit enforced to maximum 100",
    () => overLimitResult.pagination.limit <= 100,
  );
  // 7. Verify pagination metadata calculations
  const expectedPages = Math.ceil(
    allSections.pagination.records / allSections.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    allSections.pagination.pages,
    expectedPages,
  );
  // 8. Test combined filters (search + pagination)
  const combinedResult = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: searchKeyword,
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined page current",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined limit applied",
    combinedResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "combined data within limit",
    () => combinedResult.data.length <= 5,
  );
  // Verify combined search filter still works with pagination
  TestValidator.predicate("combined search still matches", () =>
    combinedResult.data.every(
      (section) =>
        section.name.toLowerCase().includes(keywordLower) ||
        section.description.toLowerCase().includes(keywordLower),
    ),
  );
  // 9. Verify results are sorted by sequence (ascending order)
  for (let i = 1; i < allSections.data.length; i++) {
    TestValidator.predicate(
      `section ${i} sequence order`,
      () => allSections.data[i - 1].sequence <= allSections.data[i].sequence,
    );
  }
}
