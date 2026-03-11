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

export async function test_api_section_search_by_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Retrieve all sections without search filter
  const allSections = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(allSections);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    allSections.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    allSections.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    allSections.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    allSections.pagination.pages >= 0,
  );
  // Test 2: Search by partial name match
  const nameSearch = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: "test",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(nameSearch);
  // Test 3: Search by partial description match
  const descriptionSearch = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: "discussion",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(descriptionSearch);
  // Test 4: Case-insensitive search validation (uppercase query)
  const caseInsensitiveSearch =
    await api.functional.discussionBoard.sections.index(connection, {
      body: {
        search: "TEST",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(caseInsensitiveSearch);
  // Test 5: Verify search results are subsets of all sections
  // This ensures deleted sections are not returned in search results
  const allSectionIds = new Set(allSections.data.map((s) => s.id));
  for (const section of nameSearch.data) {
    TestValidator.predicate(
      "name search result exists in all sections",
      allSectionIds.has(section.id),
    );
  }
  for (const section of descriptionSearch.data) {
    TestValidator.predicate(
      "description search result exists in all sections",
      allSectionIds.has(section.id),
    );
  }
  // Test 6: Case-insensitive search returns same results count
  TestValidator.equals(
    "case-insensitive search returns same count",
    nameSearch.pagination.records,
    caseInsensitiveSearch.pagination.records,
  );
  // Test 7: Search with pagination parameters
  const paginatedSearch = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: "general",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "paginated results respect limit",
    paginatedSearch.data.length <= 10,
  );
  // Test 8: Verify search narrows results (when sections exist)
  if (allSections.data.length > 0) {
    TestValidator.predicate(
      "name search returns subset or equal",
      nameSearch.pagination.records <= allSections.pagination.records,
    );
    TestValidator.predicate(
      "description search returns subset or equal",
      descriptionSearch.pagination.records <= allSections.pagination.records,
    );
  }
}
