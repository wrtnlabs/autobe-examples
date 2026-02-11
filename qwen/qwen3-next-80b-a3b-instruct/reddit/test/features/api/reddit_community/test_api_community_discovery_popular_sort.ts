import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_discovery_popular_sort(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection (unauthenticated)
  const guestConnection: api.IConnection = { host: connection.host };
  // Define request with popular sort, page 1, limit 10
  const request: IRedditCommunityCommunity.IRequest = {
    sort: "popular",
    page: 1,
    limit: 10,
  };
  // Execute request
  const response: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(guestConnection, {
      body: request,
    });
  typia.assert(response);
  // Validate response structure matches expected shape
  TestValidator.equals(
    "response structure",
    {
      pagination: response.pagination,
      data: response.data,
    },
    response,
  );
  // Validate sorting by subscriber_count DESC (popular sort)
  // Extract communities for validation
  const communities = response.data;
  // Validate that communities are sorted in descending order by subscriber_count
  // Check that every adjacent pair is in correct order: current >= next
  // This is a direct validation of the requirement, not using TestValidator.sort
  const isSortedDescending = communities.every((current, index, arr) => {
    if (index === arr.length - 1) return true; // Last element
    return current.subscriber_count >= arr[index + 1].subscriber_count;
  });
  TestValidator.predicate(
    "communities sorted by subscriber_count DESC (popular)",
    isSortedDescending,
  );
}
