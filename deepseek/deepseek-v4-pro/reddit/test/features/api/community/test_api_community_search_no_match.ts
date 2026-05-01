import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test community search with a non-matching query term.
 *
 * Verifies that the community search endpoint gracefully handles no-match
 * scenarios. When searching for a community name that does not exist on
 * the platform, the endpoint returns HTTP 200 with an empty result set
 * rather than an error. This ensures the search UI can display a clean
 * "no results found" state without triggering error handling logic.
 *
 * The test validates that pagination metadata reflects the empty result:
 * zero records and zero pages, confirming proper pagination calculation
 * when no data matches the search criteria. Since no communities are
 * created as dependencies, the search naturally returns an empty set,
 * simulating a no-match condition.
 *
 * 1. Call the public community search endpoint without any query parameters.
 * 2. Validate the response structure via typia.assert.
 * 3. Confirm the data array is empty.
 * 4. Verify pagination shows zero records and zero pages.
 */
export async function test_api_community_search_no_match(
  connection: api.IConnection,
): Promise<void> {
  const result: IPageICommunityHubCommunity.ISummary =
    await api.functional.communityHub.communities.search(connection);
  typia.assert(result);
  TestValidator.equals("empty data array", result.data.length, 0);
  TestValidator.equals("zero records", result.pagination.records, 0);
  TestValidator.equals("zero pages", result.pagination.pages, 0);
}
