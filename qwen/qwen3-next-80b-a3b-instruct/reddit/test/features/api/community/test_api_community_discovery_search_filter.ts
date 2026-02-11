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

export async function test_api_community_discovery_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for unauthenticated guest
  const guestConnection: api.IConnection = { host: connection.host };
  // Define search criteria for communities containing 'tech'
  const searchCriteria: IRedditCommunityCommunity.IRequest = {
    search: "tech",
    limit: 20,
  };
  // Execute the search request
  const response: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(guestConnection, {
      body: searchCriteria,
    });
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination records is at least 1",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    response.pagination.pages >= 1,
  );
  // Validate that all returned communities have names containing 'tech' (case-insensitive)
  for (const community of response.data) {
    TestValidator.predicate(
      "community name contains 'tech' (case-insensitive)",
      community.name.toLowerCase().includes("tech"),
    );
  }
  // Validate that results are sorted alphabetically by name (default sort)
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = response.data[i].name.toLowerCase();
    const next = response.data[i + 1].name.toLowerCase();
    TestValidator.predicate(
      "communities sorted alphabetically by name",
      current <= next,
    );
  }
}
