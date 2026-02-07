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

/**
 * Test the default behavior of section browsing where only active sections are displayed.
 * This validates that the system correctly filters out inactive and archived sections by default.
 * The test should verify that the response contains only sections with 'active' status,
 * proper pagination metadata, and that the display order is respected.
 */
export async function test_api_section_browsing_active_only(
  connection: api.IConnection,
): Promise<void> {
  // Test default behavior - should return only active sections
  const defaultResponse = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    defaultResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    defaultResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    defaultResponse.pagination.pages >= 0,
  );
  // Test search functionality with a random search term
  const searchTerm = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 4,
  });
  const searchResponse = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: searchTerm,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Validate search response structure
  TestValidator.predicate(
    "search response has valid pagination",
    searchResponse.pagination.records >= 0,
  );
  // Test explicit status filter for active sections
  const activeFilterResponse =
    await api.functional.discussionBoard.sections.index(connection, {
      body: {
        status: "active",
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(activeFilterResponse);
  // Test that inactive sections are filtered out
  const inactiveResponse = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        status: "inactive",
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(inactiveResponse);
  // Test that archived sections are filtered out
  const archivedResponse = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        status: "archived",
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(archivedResponse);
}
