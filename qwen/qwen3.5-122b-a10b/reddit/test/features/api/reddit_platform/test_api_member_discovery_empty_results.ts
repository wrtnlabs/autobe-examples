import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_discovery_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with unique string that matches no existing members
  const uniqueSearchTerm = `nonexistent_user_${RandomGenerator.alphaNumeric(16)}`;
  const searchResult = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        search: uniqueSearchTerm,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(searchResult);
  // Verify empty results with proper pagination
  TestValidator.equals(
    "search result data array is empty",
    searchResult.data.length,
    0,
  );
  TestValidator.equals(
    "search result records count is 0",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "search result pages count is 0",
    searchResult.pagination.pages,
    0,
  );
  // Test 2: Search with another unique string
  const anotherUniqueTerm = `unique_test_${RandomGenerator.alphabets(12)}`;
  const anotherSearchResult = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        search: anotherUniqueTerm,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(anotherSearchResult);
  TestValidator.equals(
    "another search result data array is empty",
    anotherSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "another search result records count is 0",
    anotherSearchResult.pagination.records,
    0,
  );
  // Test 3: Email filter with non-existent email
  const nonExistentEmail = `nonexistent_${RandomGenerator.alphaNumeric(12)}@test.invalid`;
  const emailFilterResult = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        email: nonExistentEmail,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(emailFilterResult);
  TestValidator.equals(
    "email filter result data array is empty",
    emailFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "email filter result records count is 0",
    emailFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "email filter result pages count is 0",
    emailFilterResult.pagination.pages,
    0,
  );
  // Test 4: Combined search and email filter with non-matching criteria
  const combinedResult = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        search: `no_match_${RandomGenerator.alphaNumeric(10)}`,
        email: `also_no_match_${RandomGenerator.alphaNumeric(10)}@test.invalid`,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter result data array is empty",
    combinedResult.data.length,
    0,
  );
  TestValidator.equals(
    "combined filter result records count is 0",
    combinedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filter result pages count is 0",
    combinedResult.pagination.pages,
    0,
  );
}
