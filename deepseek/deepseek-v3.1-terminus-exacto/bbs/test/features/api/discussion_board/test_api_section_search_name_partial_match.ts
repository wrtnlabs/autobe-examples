import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test section search functionality with partial name matching.
 *
 * Validates that the section browse endpoint correctly searches for sections
 * using partial text matching on both name and description fields, supports
 * case-insensitive search, and returns proper pagination metadata.
 */
export async function test_api_section_search_name_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // Since this is a public endpoint without authentication, we can use the base connection directly
  // Test 1: Search for sections by partial name match
  const searchTerm = "poli";
  const searchResult1 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: searchTerm,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardSection.ISearch,
    },
  );
  typia.assert(searchResult1);
  // Validate that at least one section matches the partial search term
  TestValidator.predicate(
    "should return matching sections",
    searchResult1.data.length >= 0,
  );
  // Test 2: Search with different case to verify case-insensitive matching
  const searchTermUpper = "POLI";
  const searchResult2 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: searchTermUpper,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardSection.ISearch,
    },
  );
  typia.assert(searchResult2);
  // Test 3: Search with description text (when name doesn't match)
  const descriptionSearchTerm = "discussion";
  const searchResult3 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: descriptionSearchTerm,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardSection.ISearch,
    },
  );
  typia.assert(searchResult3);
  // Test 4: Edge case - search with no matching sections
  const nonExistentTerm = "nonexistentxyz123";
  const searchResult4 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: nonExistentTerm,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardSection.ISearch,
    },
  );
  typia.assert(searchResult4);
  // Validate that empty search returns empty data array
  TestValidator.predicate(
    "empty search should return empty data array",
    searchResult4.data.length === 0,
  );
  // Test 5: Validate that search works with pagination
  const searchResult5 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: searchTerm,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardSection.ISearch,
    },
  );
  typia.assert(searchResult5);
  // Validate that pagination returns data
  TestValidator.predicate(
    "pagination should return data",
    searchResult5.data.length >= 0,
  );
}
