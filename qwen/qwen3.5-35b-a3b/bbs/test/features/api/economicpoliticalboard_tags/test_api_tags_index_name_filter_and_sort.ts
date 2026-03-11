import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tags_index_name_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic pagination without filters
  const baseResponse = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: { limit: 20, page: 1, sort: "name" },
    },
  );
  typia.assert(baseResponse);
  // Test 2: Name filtering with partial match
  const filteredByName = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: { name: "eco", limit: 50, page: 1, sort: "name" },
    },
  );
  typia.assert(filteredByName);
  // Test 3: Case-insensitive name filtering (uppercase should match lowercase)
  const caseInsensitive =
    await api.functional.economicPoliticalBoard.tags.index(connection, {
      body: { name: "ECON", limit: 50, page: 1, sort: "name" },
    });
  typia.assert(caseInsensitive);
  // Test 4: Sort by article count
  const sortedByCount = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: { limit: 50, page: 1, sort: "count" },
    },
  );
  typia.assert(sortedByCount);
  // Test 5: Combine name filter with count sort
  const filteredAndSorted =
    await api.functional.economicPoliticalBoard.tags.index(connection, {
      body: { name: "pol", limit: 50, page: 1, sort: "count" },
    });
  typia.assert(filteredAndSorted);
  // Test 6: Empty filter results (use non-existent pattern)
  const emptyResults = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: { name: "xyz123nonexistent", limit: 50, page: 1, sort: "name" },
    },
  );
  typia.assert(emptyResults);
  // Test 7: Pagination with name filter
  const pageTwo = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: { name: "eco", limit: 5, page: 2, sort: "name" },
    },
  );
  typia.assert(pageTwo);
  // Validate name filter results match expected
  const expectedEcoCount = baseResponse.data.filter((tag) =>
    tag.name.toLowerCase().includes("eco"),
  ).length;
  TestValidator.equals(
    "name filter results count",
    filteredByName.data.length,
    expectedEcoCount,
  );
  TestValidator.equals(
    "case-insensitive filter results count",
    caseInsensitive.data.length,
    expectedEcoCount,
  );
  // Validate combined filter and sort results match expected
  const expectedPolCount = baseResponse.data.filter((tag) =>
    tag.name.toLowerCase().includes("pol"),
  ).length;
  TestValidator.equals(
    "combined filter and sort results count",
    filteredAndSorted.data.length,
    expectedPolCount,
  );
  // Validate empty filter returns no results
  TestValidator.equals(
    "empty filter results count",
    emptyResults.data.length,
    0,
  );
  // Validate pagination metadata accuracy
  TestValidator.predicate(
    "pagination records at least data length",
    baseResponse.pagination.records >= baseResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages at least current page",
    baseResponse.pagination.pages >= baseResponse.pagination.current,
  );
  // Validate sort order by name (ascending)
  if (baseResponse.data.length > 1) {
    for (let i = 1; i < baseResponse.data.length; i++) {
      const prev = baseResponse.data[i - 1].name;
      const curr = baseResponse.data[i].name;
      if (prev !== curr) {
        TestValidator.predicate(
          `tag names sorted alphabetically (index ${i})`,
          prev < curr,
        );
      }
    }
  }
  // Validate sort order by count (descending)
  if (sortedByCount.data.length > 1) {
    for (let i = 1; i < sortedByCount.data.length; i++) {
      const prev = sortedByCount.data[i - 1].article_count;
      const curr = sortedByCount.data[i].article_count;
      if (prev !== curr) {
        TestValidator.predicate(
          `tag counts sorted descending (index ${i})`,
          prev >= curr,
        );
      }
    }
  }
  // Validate pagination page boundaries
  TestValidator.equals("page two current page", pageTwo.pagination.current, 2);
  TestValidator.predicate(
    "page two limit respected",
    pageTwo.pagination.limit <= 5,
  );
  TestValidator.predicate(
    "page two within total pages",
    pageTwo.pagination.current <= pageTwo.pagination.pages,
  );
  // Validate consistency between filtered results and base data
  TestValidator.equals(
    "all filtered tags in base response",
    filteredByName.data.every((tag) =>
      baseResponse.data.some((baseTag) => baseTag.id === tag.id),
    ),
    true,
  );
}
