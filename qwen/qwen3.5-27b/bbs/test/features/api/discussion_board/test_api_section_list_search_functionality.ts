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
 * Test search functionality for discussion board sections.
 *
 * Validates that section search performs partial text matching on name and
 * description fields with case-insensitive behavior, and properly returns
 * filtered results with accurate pagination metadata.
 */
export async function test_api_section_list_search_functionality(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection (no authentication required)
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Test search with term that should match section names
  const searchResult1 = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {
        search: "Polit",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(searchResult1);
  // Validate search results contain matching sections
  TestValidator.predicate(
    "search returns sections matching 'Polit'",
    searchResult1.data.length > 0,
  );
  // Verify each returned section matches search criteria
  await ArrayUtil.asyncForEach(searchResult1.data, async (section) => {
    const matchesName = section.name.toLowerCase().includes("polit");
    const matchesDescription = section.description
      ? section.description.toLowerCase().includes("polit")
      : false;
    TestValidator.predicate(
      `section "${section.name}" matches search term`,
      matchesName || matchesDescription,
    );
  });
  // 3. Test case-insensitive matching (lowercase search)
  const searchResult2 = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {
        search: "polit",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(searchResult2);
  // Should return same results as uppercase search
  TestValidator.equals(
    "case-insensitive search returns same count",
    searchResult2.data.length,
    searchResult1.data.length,
  );
  // 4. Test search with no matches
  const searchResult3 = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {
        search: "xyznonexistentsection12345",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(searchResult3);
  // Verify empty results
  TestValidator.equals(
    "non-matching search returns empty data",
    searchResult3.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching search has zero records",
    searchResult3.pagination.records,
    0,
  );
  // 5. Test search matching description field only
  const searchResult4 = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {
        search: "current",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(searchResult4);
  // Validate sections match description field
  await ArrayUtil.asyncForEach(searchResult4.data, async (section) => {
    const matchesDescription = section.description
      ? section.description.toLowerCase().includes("current")
      : false;
    const matchesName = section.name.toLowerCase().includes("current");
    TestValidator.predicate(
      `section "${section.name}" matches 'current' in name or description`,
      matchesName || matchesDescription,
    );
  });
  // 6. Test search matching name field only
  const searchResult5 = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {
        search: "Economy",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(searchResult5);
  // Validate sections match name field
  await ArrayUtil.asyncForEach(searchResult5.data, async (section) => {
    const matchesName = section.name.toLowerCase().includes("economy");
    const matchesDescription = section.description
      ? section.description.toLowerCase().includes("economy")
      : false;
    TestValidator.predicate(
      `section "${section.name}" matches 'Economy' in name or description`,
      matchesName || matchesDescription,
    );
  });
  // 7. Validate pagination metadata accuracy
  TestValidator.equals(
    "pagination current page matches request",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    searchResult1.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records equals data length",
    searchResult1.pagination.records === searchResult1.data.length,
  );
  // 8. Test with different pagination parameters
  const searchResult6 = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {
        search: "Polit",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(searchResult6);
  TestValidator.equals(
    "pagination limit reflects request",
    searchResult6.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    searchResult6.pagination.pages ===
      Math.ceil(
        searchResult6.pagination.records / searchResult6.pagination.limit,
      ),
  );
}
