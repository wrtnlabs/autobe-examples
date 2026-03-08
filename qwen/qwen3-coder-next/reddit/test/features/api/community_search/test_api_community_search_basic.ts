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

export async function test_api_community_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection for testing
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Search with empty term to get all communities
  const allCommunities = await api.functional.redditLike.communities.search(
    userConnection,
    {
      body: {
        search: "",
        sort: "subscribers",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(allCommunities);
  // Verify response structure
  TestValidator.predicate(
    "has pagination info",
    allCommunities.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(allCommunities.data));
  // 2. Test case-insensitive search with partial matching
  if (allCommunities.data.length > 0) {
    // Use first community name as search term
    const searchTerm = allCommunities.data[0].name.substring(
      0,
      Math.min(3, allCommunities.data[0].name.length),
    );
    const searchResult = await api.functional.redditLike.communities.search(
      userConnection,
      {
        body: {
          search: searchTerm.toUpperCase(), // Test case-insensitivity
          sort: "subscribers",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
    typia.assert(searchResult);
    // Verify search returned results
    TestValidator.predicate(
      "search returns results",
      searchResult.data.length >= 1,
    );
  }
  // 3. Test different sort orders
  const sortTests: ("subscribers" | "newest" | "alpha")[] = [
    "subscribers",
    "newest",
    "alpha",
  ];
  for (const sort of sortTests) {
    const sortedResult = await api.functional.redditLike.communities.search(
      userConnection,
      {
        body: {
          search: "",
          sort: sort,
          page: 1,
          limit: 5,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
    typia.assert(sortedResult);
    // Verify pagination structure for each sort
    TestValidator.predicate(
      `pagination exists for ${sort}`,
      sortedResult.pagination !== undefined,
    );
  }
  // 4. Test pagination parameters
  const paginated = await api.functional.redditLike.communities.search(
    userConnection,
    {
      body: {
        search: "",
        sort: "subscribers",
        page: 1,
        limit: 2,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(paginated);
  // Verify pagination constraints
  TestValidator.equals(
    "pagination limit enforced",
    paginated.data.length <= 2,
    true,
  );
  TestValidator.predicate(
    "pagination has total records",
    paginated.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    paginated.pagination.pages >= 0,
  );
  // 5. Test search with no matches
  const noMatch = await api.functional.redditLike.communities.search(
    userConnection,
    {
      body: {
        search: "nonexistentcommunity12345",
        sort: "subscribers",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(noMatch);
  // Verify empty result for non-matching search
  TestValidator.equals(
    "non-matching search returns empty",
    noMatch.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching search has zero records",
    noMatch.pagination.records,
    0,
  );
}
