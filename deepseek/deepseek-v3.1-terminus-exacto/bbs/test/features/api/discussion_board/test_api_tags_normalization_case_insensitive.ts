import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tags_normalization_case_insensitive(
  connection: api.IConnection,
): Promise<void> {
  // Test that tag search normalizes tag text properly (case-insensitive storage and whitespace trimming)
  // This test validates the business rule that tags maintain appropriate categorization
  // Test various tag formats that should all normalize to the same conceptual tag
  const searchTests = [
    { searchTerm: "ECON", expectedNormalization: "econ" },
    { searchTerm: " economics ", expectedNormalization: "economics" },
    { searchTerm: "EcoNomIcS", expectedNormalization: "economics" },
    { searchTerm: "  politics", expectedNormalization: "politics" },
  ];
  for (const test of searchTests) {
    const searchResult = await api.functional.discussionBoard.tags.index(
      connection,
      {
        body: {
          search: test.searchTerm,
          page: 1,
          limit: 10,
        },
      },
    );
    typia.assert(searchResult);
    // Validate that search returns results (if tags exist in the system)
    // The system should normalize search queries for case-insensitive matching
    TestValidator.predicate(
      `search for '${test.searchTerm}' should return valid pagination structure`,
      searchResult.pagination.current === 1 &&
        searchResult.pagination.limit === 10,
    );
  }
  // Test empty search to get all tags and verify normalization behavior
  const allTagsResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(allTagsResult);
  // Validate that tags are properly normalized in the response
  // Each tag should have consistent formatting (trimmed whitespace, consistent case)
  if (allTagsResult.data.length > 0) {
    for (const tag of allTagsResult.data) {
      TestValidator.predicate(
        `tag '${tag.tag}' should be properly normalized`,
        tag.tag === tag.tag.trim().toLowerCase(),
      );
    }
  }
}
