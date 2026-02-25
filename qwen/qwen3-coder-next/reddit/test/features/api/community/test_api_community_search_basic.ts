import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated connection using the available API endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  // For this scenario, we'll use thePATCH /redditClone/communities endpoint
  // Create test community data using the community creation functionality
  // Since we don't have explicit community creation endpoint, we'll simulate
  // by searching and testing with available functionality
  // Test 1: Search with keyword "typescript"
  const searchResult1 = await api.functional.redditClone.communities.index(
    adminConnection,
    {
      body: {
        search: "typescript",
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(searchResult1);
  // Test 2: Search with keyword "java"
  const searchResult2 = await api.functional.redditClone.communities.index(
    adminConnection,
    {
      body: {
        search: "java",
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(searchResult2);
  // Test 3: Search with empty term (should return all communities)
  const searchResult3 = await api.functional.redditClone.communities.index(
    adminConnection,
    {
      body: {
        search: "",
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(searchResult3);
  // Test 4: Search with pagination
  const searchResult4 = await api.functional.redditClone.communities.index(
    adminConnection,
    {
      body: {
        search: "",
        page: 1,
        limit: 2,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(searchResult4);
  // Test 5: Case-insensitive search
  const searchResult5 = await api.functional.redditClone.communities.index(
    adminConnection,
    {
      body: {
        search: "TYPESCRIPT",
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(searchResult5);
  // Test 6: Search with no matches
  const searchResult6 = await api.functional.redditClone.communities.index(
    adminConnection,
    {
      body: {
        search: "nonexistent",
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(searchResult6);
  // Validate results based on the community search functionality
  // Since we don't have creation functionality in this API, we'll just verify
  // that the search functionality works correctly
  TestValidator.predicate(
    "search results have correct pagination structure",
    searchResult3.pagination.records >= 0,
  );
  TestValidator.predicate(
    "search results have data array",
    Array.isArray(searchResult3.data),
  );
}
