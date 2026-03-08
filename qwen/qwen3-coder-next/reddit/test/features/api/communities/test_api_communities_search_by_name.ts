import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_communities_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search for communities with matching name
  const searchResults = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        search: "community",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(searchResults);
  // Test 2: Verify empty search results
  const noMatchResults = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        search: "nonexistent",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(noMatchResults);
  TestValidator.equals("no matches found", noMatchResults.data.length, 0);
  // Test 3: Search with different criteria
  const testSearch = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        search: "test",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(testSearch);
}
