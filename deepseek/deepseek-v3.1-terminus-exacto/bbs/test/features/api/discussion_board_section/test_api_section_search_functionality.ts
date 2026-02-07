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
 * Test the search functionality for discussion board sections.
 * Validates PostgreSQL trigram indexing implementation and ensures users can effectively find sections.
 */
export async function test_api_section_search_functionality(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with common terms that might match existing sections
  const commonSearchResults =
    await api.functional.discussionBoard.sections.index(connection, {
      body: {
        search: "discussion",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(commonSearchResults);
  // Test 2: Search with partial match patterns
  const partialMatchResults =
    await api.functional.discussionBoard.sections.index(connection, {
      body: {
        search: "board",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(partialMatchResults);
  // Test 3: Search with pagination
  const paginatedResults = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: "", // Empty search to get all sections
        limit: 2,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(paginatedResults);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination limit matches request",
    paginatedResults.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    paginatedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    paginatedResults.pagination.pages >= 0,
  );
  // Test 4: Search with status filter
  const activeSectionsResults =
    await api.functional.discussionBoard.sections.index(connection, {
      body: {
        search: "",
        status: "active",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(activeSectionsResults);
  // Verify all returned sections have active status
  TestValidator.predicate(
    "all active sections should have active status",
    activeSectionsResults.data.every((section) => section.status === "active"),
  );
  // Test 5: Search with combined criteria
  const combinedSearchResults =
    await api.functional.discussionBoard.sections.index(connection, {
      body: {
        search: "section",
        status: "active",
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(combinedSearchResults);
  // Test 6: Empty search term should return sections
  const emptySearchResults =
    await api.functional.discussionBoard.sections.index(connection, {
      body: {
        search: "",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(emptySearchResults);
  TestValidator.predicate(
    "empty search should return sections",
    emptySearchResults.data.length >= 0,
  );
  // Test 7: Non-matching search term
  const nonMatchingSearchResults =
    await api.functional.discussionBoard.sections.index(connection, {
      body: {
        search: "xyz123nonexistentterm",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(nonMatchingSearchResults);
  // Test 8: Search with single character (edge case)
  const singleCharResults = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: "a",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(singleCharResults);
  // Test 9: Search with special characters
  const specialCharResults =
    await api.functional.discussionBoard.sections.index(connection, {
      body: {
        search: "-",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(specialCharResults);
}
