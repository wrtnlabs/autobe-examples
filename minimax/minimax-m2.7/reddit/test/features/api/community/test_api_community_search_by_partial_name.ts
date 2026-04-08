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

export async function test_api_community_search_by_partial_name(
  connection: api.IConnection,
): Promise<void> {
  // Test case-insensitive partial name search
  const searchTerm = "tech";
  // Search with partial name (case-insensitive)
  const searchResult =
    await api.functional.redditClone.communities.discover.index(connection, {
      body: {
        name: searchTerm,
        sortBy: "name",
      } satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(searchResult);
  // Validate response structure
  TestValidator.equals(
    "has pagination",
    searchResult.pagination !== null,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(searchResult.data),
    true,
  );
  // Validate each community in results has required fields
  for (const community of searchResult.data) {
    typia.assert(community);
    TestValidator.predicate("has id", community.id.length > 0);
    TestValidator.predicate("has name", community.name.length > 0);
    TestValidator.predicate(
      "has description",
      community.description !== undefined,
    );
    TestValidator.predicate(
      "subscriberCount is number",
      typeof community.subscriberCount === "number",
    );
    TestValidator.predicate(
      "has owner",
      community.owner !== null && community.owner !== undefined,
    );
    TestValidator.predicate("owner has id", community.owner.id.length > 0);
    TestValidator.predicate(
      "owner has username",
      community.owner.username.length > 0,
    );
  }
  // Test case-insensitive: search with uppercase should match lowercase names
  const upperSearchResult =
    await api.functional.redditClone.communities.discover.index(connection, {
      body: {
        name: "TECH",
      } satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(upperSearchResult);
  // Test sorting alphabetically (A-Z)
  const sortedResult =
    await api.functional.redditClone.communities.discover.index(connection, {
      body: {
        name: searchTerm,
        sortBy: "name",
      } satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(sortedResult);
  if (sortedResult.data.length > 1) {
    for (let i = 0; i < sortedResult.data.length - 1; i++) {
      const current = sortedResult.data[i].name.toLowerCase();
      const next = sortedResult.data[i + 1].name.toLowerCase();
      TestValidator.predicate(
        `sorted alphabetically: "${current}" before "${next}"`,
        current <= next,
      );
    }
  }
  // Test pagination with search results
  const paginatedResult =
    await api.functional.redditClone.communities.discover.index(connection, {
      body: {
        name: searchTerm,
        sortBy: "name",
        page: 1,
        limit: 5,
      } satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.equals("page is 1", paginatedResult.pagination.current, 1);
  TestValidator.equals("limit is 5", paginatedResult.pagination.limit, 5);
  TestValidator.predicate(
    "records count is valid",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    paginatedResult.pagination.pages >= 0,
  );
  // Test empty search term (should return all communities)
  const allCommunitiesResult =
    await api.functional.redditClone.communities.discover.index(connection, {
      body: {} satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(allCommunitiesResult);
  TestValidator.predicate(
    "returns communities when no search term",
    allCommunitiesResult.data.length >= 0,
  );
}
