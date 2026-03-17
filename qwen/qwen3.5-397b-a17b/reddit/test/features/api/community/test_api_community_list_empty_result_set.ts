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
 * Test community list endpoint with empty result set.
 *
 * Validates that the community browsing endpoint correctly handles the edge case
 * where no communities exist on the platform. This test ensures the endpoint
 * returns a valid response structure with an empty data array and correct
 * pagination metadata (records: 0, pages: 0) when queried in the initial platform
 * state before any communities have been created.
 */
export async function test_api_community_list_empty_result_set(
  connection: api.IConnection,
): Promise<void> {
  // Call community list endpoint without creating any communities
  const result: IPageIRedditCloneCommunity.ISummary =
    await api.functional.redditClone.communities.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditCloneCommunity.IRequest,
    });
  // Validate response structure
  typia.assert(result);
  // Verify empty data array
  TestValidator.equals("data array is empty", result.data, []);
  // Verify pagination metadata for empty result set
  TestValidator.equals("records count", result.pagination.records, 0);
  TestValidator.equals("pages count", result.pagination.pages, 0);
}
