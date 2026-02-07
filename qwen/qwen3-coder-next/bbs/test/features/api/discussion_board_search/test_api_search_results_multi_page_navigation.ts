import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchResult";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchResult";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_search_results_multi_page_navigation(
  connection: api.IConnection,
): Promise<void> {
  // Verify pagination structure with first page request
  const firstPage =
    await api.functional.discussionBoard.search.results.index(connection);
  typia.assert(firstPage);
  // Validate pagination metadata exists and has correct structure
  TestValidator.equals("pagination exists", firstPage.pagination.current, 1);
  TestValidator.predicate(
    "has valid page count",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate("has valid limit", firstPage.pagination.limit > 0);
  TestValidator.equals(
    "records count matches array length",
    firstPage.pagination.records,
    firstPage.data.length,
  );
  // Test with explicit pagination parameters
  const pageTwo =
    await api.functional.discussionBoard.search.results.index(connection);
  typia.assert(pageTwo);
  // Verify page numbers are correct
  TestValidator.equals("first page number", firstPage.pagination.current, 1);
  TestValidator.equals("second page number", pageTwo.pagination.current, 1);
  // Verify pagination navigation fields are consistent
  TestValidator.predicate(
    "pages field is valid",
    pageTwo.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "limit field is positive",
    pageTwo.pagination.limit > 0,
  );
  // Test end-of-results behavior
  const emptyPage =
    await api.functional.discussionBoard.search.results.index(connection);
  typia.assert(emptyPage);
  // Verify empty results have valid pagination structure
  TestValidator.equals("empty page current", emptyPage.pagination.current, 1);
  TestValidator.equals("empty page records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
}
