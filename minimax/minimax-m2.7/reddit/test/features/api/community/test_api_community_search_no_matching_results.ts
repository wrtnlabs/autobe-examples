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
 * Test community search with no matching results.
 *
 * Scenario: When a user searches for a community name that does not exist,
 * the system should return an empty page with pagination showing total records as 0.
 * The response should still be a valid JSON object with the correct structure
 * (pagination and data arrays) even when empty.
 */
export async function test_api_community_search_no_matching_results(
  connection: api.IConnection,
): Promise<void> {
  // Search for a non-existent community name
  const nonexistentName = "xyznonexistent123";
  const response = await api.functional.redditClone.communities.discover.index(
    connection,
    {
      body: {
        name: nonexistentName,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  // Validate response structure with typia.assert
  typia.assert(response);
  // Validate pagination shows 0 records (empty result)
  TestValidator.equals(
    "pagination records should be 0 for no matching results",
    response.pagination.records,
    0,
  );
  // Validate data array is empty
  TestValidator.equals(
    "data array should be empty when no communities match",
    response.data.length,
    0,
  );
  // Validate pagination structure is still correct
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination pages should be 0 when no records",
    response.pagination.pages,
    0,
  );
}
