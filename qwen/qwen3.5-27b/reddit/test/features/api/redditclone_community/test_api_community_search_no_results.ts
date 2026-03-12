import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test edge case when community search returns no matching results.
 *
 * This test validates that the community search API gracefully handles
 * scenarios where no communities match the search criteria, returning
 * valid empty results rather than errors.
 */
export async function test_api_community_search_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with a nonexistent community name
  const searchRequest1 = {
    search: "nonexistentcommunityxyz123",
  } satisfies IRedditCloneCommunity.IRequest;
  const output1 = await api.functional.redditClone.communities.index(
    connection,
    { body: searchRequest1 },
  );
  typia.assert(output1);
  // Verify pagination metadata for empty results
  TestValidator.equals("current page is 1", output1.pagination.current, 1);
  TestValidator.equals("records count is 0", output1.pagination.records, 0);
  TestValidator.equals("pages count is 0", output1.pagination.pages, 0);
  TestValidator.equals("data array is empty", output1.data.length, 0);
  // Test 2: Search with special characters to verify safe handling
  const searchRequest2 = {
    search: "test@#$%",
  } satisfies IRedditCloneCommunity.IRequest;
  const output2 = await api.functional.redditClone.communities.index(
    connection,
    { body: searchRequest2 },
  );
  typia.assert(output2);
  // Verify special characters are handled safely (no errors)
  TestValidator.equals(
    "special char search returns empty",
    output2.data.length,
    0,
  );
  TestValidator.equals(
    "special char pagination records is 0",
    output2.pagination.records,
    0,
  );
  // Test 3: Search with very long random string
  const searchRequest3 = {
    search: RandomGenerator.alphabets(100),
  } satisfies IRedditCloneCommunity.IRequest;
  const output3 = await api.functional.redditClone.communities.index(
    connection,
    { body: searchRequest3 },
  );
  typia.assert(output3);
  // Verify long search string is handled correctly
  TestValidator.equals(
    "long string search returns empty",
    output3.data.length,
    0,
  );
  TestValidator.equals(
    "long string pagination is valid",
    output3.pagination.pages,
    0,
  );
}
