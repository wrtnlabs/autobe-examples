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

export async function test_api_community_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Empty search results with non-existent name filter
  const nonexistentName =
    "xyznonexistent123_" + RandomGenerator.alphaNumeric(8);
  const emptyResult = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        name: nonexistentName,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Verify data array is empty
  TestValidator.equals(
    "empty results array length",
    emptyResult.data.length,
    0,
  );
  // Verify pagination metadata in empty results
  TestValidator.equals(
    "pagination records is 0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination has valid current page",
    emptyResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    emptyResult.pagination.limit > 0,
  );
  // Test 2: Different non-matching name patterns also return empty
  const anotherNonexistent =
    "__abc123nonexist__" + RandomGenerator.alphaNumeric(12);
  const anotherEmptyResult = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        name: anotherNonexistent,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(anotherEmptyResult);
  // Should return empty array
  TestValidator.equals(
    "another non-matching name - empty results",
    anotherEmptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "another non-matching name - records is 0",
    anotherEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "another non-matching name - pages is 0",
    anotherEmptyResult.pagination.pages,
    0,
  );
  // Test 3: Empty results with pagination parameters still work correctly
  const emptyWithPagination =
    await api.functional.redditClone.communities.index(connection, {
      body: {
        name:
          "definitely_no_community_has_this_super_long_ridiculous_name_that_should_never_exist_" +
          RandomGenerator.alphaNumeric(30),
        page: 1,
        limit: 10,
      } satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(emptyWithPagination);
  // Empty results with pagination params should still have proper pagination
  TestValidator.equals(
    "empty with pagination - data length",
    emptyWithPagination.data.length,
    0,
  );
  TestValidator.equals(
    "empty with pagination - records",
    emptyWithPagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty with pagination - pages",
    emptyWithPagination.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty with pagination - current page",
    emptyWithPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty with pagination - limit preserved",
    emptyWithPagination.pagination.limit,
    10,
  );
}
