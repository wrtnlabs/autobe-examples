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

export async function test_api_community_search_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Prepare connection for search operation
  const searchConnection: api.IConnection = { host: connection.host };
  // Generate a unique search term that is unlikely to match any existing community
  const uniqueSearchTerm = `nonexistent_${RandomGenerator.alphaNumeric(12)}`;
  // Execute search with no-match term
  const result = await api.functional.redditLike.communities.search(
    searchConnection,
    {
      body: {
        search: uniqueSearchTerm,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(result);
  // Validate search results structure and empty result set
  TestValidator.equals("search results empty", result.data.length, 0);
  TestValidator.equals("pagination records zero", result.pagination.records, 0);
  TestValidator.equals("pagination pages zero", result.pagination.pages, 0);
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
}
