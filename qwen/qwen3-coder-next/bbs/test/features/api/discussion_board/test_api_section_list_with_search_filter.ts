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

export async function test_api_section_list_with_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test search with empty search term (should return all sections)
  const allSections = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: typia.random<IDiscussionBoardSection.IRequest>(),
    },
  );
  typia.assert(allSections);
  // 2. Test search with partial text if there are sections
  if (allSections.data.length > 0) {
    // Use first section name to search
    const searchTerm = allSections.data[0].name.substring(
      0,
      Math.min(5, allSections.data[0].name.length),
    );
    const searchOutput = await api.functional.discussionBoard.sections.index(
      connection,
      {
        body: {
          search: searchTerm,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
    typia.assert(searchOutput);
    // 3. Verify search results contain matching sections
    TestValidator.predicate(
      "search returns at least one result when matching",
      searchOutput.data.length > 0,
    );
  }
  // 4. Test search with no results using unique term
  const noResultOutput = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: "NonExistentTerm12345XYZ",
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(noResultOutput);
  TestValidator.equals(
    "search with no results returns empty array",
    0,
    noResultOutput.data.length,
  );
  // 5. Test search with special characters
  const specialCharOutput = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: "test@#$%",
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(specialCharOutput);
  // 6. Test search with mixed case
  const mixedCaseOutput = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        search: "MiXeDcAsE",
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(mixedCaseOutput);
}
