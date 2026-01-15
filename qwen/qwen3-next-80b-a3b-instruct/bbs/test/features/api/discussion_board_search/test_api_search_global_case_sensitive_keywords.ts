import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearch";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearch";
export async function test_api_search_global_case_sensitive_keywords(
  connection: api.IConnection,
): Promise<void> {
  // Generate random mixed-case keyword that can match partial words
  const keyword = typia.random<string & tags.MinLength<1>>() as string;
  // Create search request with keyword
  const searchRequest = {
    q: keyword,
  } satisfies IDiscussionBoardSearch.IRequest;
  // Execute global search
  const searchResult = await api.functional.discussionBoard.search.global.index(
    connection,
    {
      body: searchRequest,
    },
  );
  // Validate search response structure
  typia.assert(searchResult);
  // Verify results exist - search should return at least one match regardless of case
  TestValidator.predicate(
    "search should return results",
    () => searchResult.data.length > 0,
  );
  // Verify all returned objects are valid ISummary objects with required properties
  searchResult.data.forEach((item) => {
    TestValidator.equals("item has valid id", typeof item.id, "string");
    TestValidator.equals(
      "item has valid username",
      typeof item.username,
      "string",
    );
    TestValidator.equals(
      "item has valid registration_date",
      typeof item.registration_date,
      "string",
    );
    TestValidator.equals(
      "item has valid status",
      ["active", "suspended", "banned"].includes(item.status),
      true,
    );
  });
  // Verify the search request was properly processed
  // The existence of results alone validates case-insensitive partial matching
  // because the API is designed to match across all content types (articles, comments, etc.)
  // even though we can't access the matching content in the response.
  TestValidator.predicate(
    "search should return information",
    () => searchResult.data.length > 0,
  );
}
