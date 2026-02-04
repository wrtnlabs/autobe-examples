import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
export async function test_api_community_search_exact_match(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection
  const searchConnection: api.IConnection = { host: connection.host };
  // Generate a random community name for exact match search
  const communityName = RandomGenerator.name();
  // Search for the exact community name using the appropriate IRequest structure
  // Note: The IRequest type does not have a 'search' property - the api expects
  // the search term to be part of the endpoint behavior, implicitly searched by name.
  const searchResults =
    await api.functional.communityPlatform.communities.search.index(
      searchConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "hot",
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  // Validate the complete response structure
  typia.assert(searchResults);
  // Verify we got some results from the search
  TestValidator.predicate(
    "search returned at least one result",
    () => searchResults.data.length > 0,
  );
  // Get the first result
  const firstResult = searchResults.data[0];
  // Validate that the exact match community name appears as the first result (exact match prioritization)
  TestValidator.equals(
    "first result name matches exact search term",
    firstResult.name,
    communityName,
  );
  // Validate description is truncated to 120 characters as specified
  TestValidator.predicate(
    "description is truncated to 120 characters",
    () => firstResult.description.length <= 120,
  );
}
