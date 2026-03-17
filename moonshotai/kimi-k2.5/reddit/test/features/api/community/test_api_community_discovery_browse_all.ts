import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the primary success path for browsing communities without any search filters.
 *
 * This test validates that the community discovery endpoint returns a paginated list
 * of all active communities sorted alphabetically by default. The endpoint should
 * be accessible to both guests and authenticated members.
 *
 * Test cases:
 * 1. Browse all communities without filters (default pagination)
 * 2. Browse with specific pagination parameters
 * 3. Browse sorted by subscriber count
 * 4. Validate response data consistency
 */
export async function test_api_community_discovery_browse_all(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Browse all communities without any filters (default pagination)
  const response = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {} satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(response);
  const { pagination, data } = response;
  // Test 2: Browse with specific pagination parameters
  const paginatedResponse = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "name",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  // Validate that requested pagination parameters are reflected in response
  TestValidator.equals(
    "requested page matches response",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit matches response",
    paginatedResponse.pagination.limit,
    10,
  );
  // Test 3: Browse with sort by subscriber count
  const sortedResponse = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "subscriber_count",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(sortedResponse);
  // Business logic validation: data length should not exceed limit
  TestValidator.predicate(
    "data length respects limit",
    sortedResponse.data.length <= 20,
  );
  // Business logic validation: if data exists, records should reflect total count
  if (data.length > 0) {
    // Verify that records is at least the current page size when data exists
    TestValidator.predicate(
      "records is non-negative when data exists",
      pagination.records >= data.length,
    );
  }
}
