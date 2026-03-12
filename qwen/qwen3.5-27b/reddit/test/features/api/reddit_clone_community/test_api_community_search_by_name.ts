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

/**
 * Test community search functionality with case-insensitive partial matching.
 *
 * This test validates the search and filtering capabilities for discovering
 * communities on the platform. It tests:
 * - Case-insensitive partial matching on community names
 * - Filtering results based on search terms
 * - Sorting by different fields (subscriberCount, createdAt)
 * - Pagination and result structure validation
 */
export async function test_api_community_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search for communities with 'tech' keyword (case-insensitive)
  const techSearch = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        search: "tech",
        page: 1,
        pageSize: 20,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(techSearch);
  // Verify pagination structure
  TestValidator.predicate(
    "tech search has valid pagination",
    techSearch.pagination.current >= 1 &&
      techSearch.pagination.limit > 0 &&
      techSearch.pagination.records >= 0,
  );
  // Verify all results contain 'tech' (case-insensitive)
  await ArrayUtil.asyncForEach(techSearch.data, async (community) => {
    typia.assert(community);
    TestValidator.predicate(
      `community ${community.name} contains 'tech'`,
      community.name.toLowerCase().includes("tech"),
    );
  });
  // Test 2: Search with empty term should return all communities
  const allCommunities = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        search: "",
        page: 1,
        pageSize: 100,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(allCommunities);
  TestValidator.predicate(
    "empty search returns communities",
    allCommunities.pagination.records >= 0,
  );
  // Test 3: Test sorting by subscriberCount (descending)
  const sortedBySubscribers =
    await api.functional.redditClone.communities.index(connection, {
      body: {
        search: "",
        page: 1,
        pageSize: 20,
        sort: "subscriberCount",
        order: "desc",
      } satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(sortedBySubscribers);
  // Verify communities are sorted by subscriber count descending
  if (sortedBySubscribers.data.length > 1) {
    await ArrayUtil.asyncForEach(
      sortedBySubscribers.data.slice(1),
      async (community, index) => {
        typia.assert(community);
        const previousCommunity = sortedBySubscribers.data[index];
        typia.assert(previousCommunity);
        TestValidator.predicate(
          `community at index ${index} has >= subscribers than index ${index + 1}`,
          previousCommunity.subscriber_count >= community.subscriber_count,
        );
      },
    );
  }
  // Test 4: Test sorting by createdAt (descending)
  const sortedByDate = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        search: "",
        page: 1,
        pageSize: 20,
        sort: "createdAt",
        order: "desc",
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(sortedByDate);
  // Verify communities are sorted by creation date descending
  if (sortedByDate.data.length > 1) {
    await ArrayUtil.asyncForEach(
      sortedByDate.data.slice(1),
      async (community, index) => {
        typia.assert(community);
        const previousCommunity = sortedByDate.data[index];
        typia.assert(previousCommunity);
        TestValidator.predicate(
          `community at index ${index} was created >= than index ${index + 1}`,
          new Date(previousCommunity.created_at).getTime() >=
            new Date(community.created_at).getTime(),
        );
      },
    );
  }
  // Test 5: Verify each community has complete summary with owner information
  await ArrayUtil.asyncForEach(allCommunities.data, async (community) => {
    typia.assert(community);
    // Verify community has required fields
    TestValidator.predicate(
      `community ${community.id} has valid name`,
      community.name.length >= 3 && community.name.length <= 50,
    );
    TestValidator.predicate(
      `community ${community.id} has non-negative subscriber count`,
      community.subscriber_count >= 0,
    );
    // Verify owner information is present
    typia.assert(community.owner);
    TestValidator.predicate(
      `community ${community.id} has owner with username`,
      community.owner.username.length > 0,
    );
    TestValidator.predicate(
      `community ${community.id} has owner with display name`,
      community.owner.display_name.length > 0,
    );
    TestValidator.predicate(
      `community ${community.id} has owner with valid karma`,
      typeof community.owner.karma === "number",
    );
  });
  // Test 6: Test pagination with specific page size
  const paginatedResults = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        search: "",
        page: 1,
        pageSize: 5,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(paginatedResults);
  TestValidator.equals(
    "pagination limit matches pageSize",
    paginatedResults.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data array length does not exceed limit",
    paginatedResults.data.length <= 5,
  );
  // Test 7: Test case-insensitive search with mixed case
  const mixedCaseSearch = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        search: "TeCh",
        page: 1,
        pageSize: 20,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(mixedCaseSearch);
  // Verify all results contain 'tech' regardless of case
  await ArrayUtil.asyncForEach(mixedCaseSearch.data, async (community) => {
    typia.assert(community);
    TestValidator.predicate(
      `community ${community.name} matches case-insensitive search 'TeCh'`,
      community.name.toLowerCase().includes("tech"),
    );
  });
}
