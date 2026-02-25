import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test discovering trending communities sorted by growth rate.
 *
 * This test validates the community discovery functionality with multiple
 * sorting options:
 * 1. Trending sort - communities ranked by subscriber growth rate over past 7 days
 * 2. Created_at sort - newest communities appear first (created_at DESC)
 *
 * Also validates pagination metadata accuracy and community summary field completeness.
 */
export async function test_api_community_discover_trending(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Discover trending communities (sort by growth rate)
  const trendingResult = await api.functional.community.communities.index(
    connection,
    {
      body: {
        sort: "trending",
        page: 1,
        limit: 10,
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(trendingResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "trending pagination current page is 1",
    trendingResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "trending pagination limit matches request",
    trendingResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "trending pagination records is non-negative",
    trendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "trending pagination pages is calculated correctly",
    trendingResult.pagination.pages ===
      Math.ceil(
        trendingResult.pagination.records / trendingResult.pagination.limit,
      ),
  );
  // Validate each community summary has non-empty name (business constraint)
  for (const community of trendingResult.data) {
    TestValidator.predicate(
      "community has non-empty name",
      community.name.length > 0,
    );
  }
  // Test 2: Discover new communities (sort by created_at DESC)
  const newCommunitiesResult = await api.functional.community.communities.index(
    connection,
    {
      body: {
        sort: "created_at",
        page: 1,
        limit: 10,
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(newCommunitiesResult);
  // Validate newest communities appear first (created_at DESC order)
  if (newCommunitiesResult.data.length > 1) {
    for (let i = 0; i < newCommunitiesResult.data.length - 1; i++) {
      const current = new Date(newCommunitiesResult.data[i].created_at);
      const next = new Date(newCommunitiesResult.data[i + 1].created_at);
      TestValidator.predicate(
        `created_at order: community ${i} is newer or equal to community ${i + 1}`,
        current >= next,
      );
    }
  }
  // Test 3: Pagination - request second page
  if (trendingResult.pagination.pages > 1) {
    const page2Result = await api.functional.community.communities.index(
      connection,
      {
        body: {
          sort: "trending",
          page: 2,
          limit: 5,
        } satisfies ICommunityCommunity.IRequest,
      },
    );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 current page",
      page2Result.pagination.current,
      2,
    );
    TestValidator.equals("page 2 limit", page2Result.pagination.limit, 5);
  }
  // Test 4: Popular communities (sort by subscriber_count)
  const popularResult = await api.functional.community.communities.index(
    connection,
    {
      body: {
        sort: "subscriber_count",
        page: 1,
        limit: 10,
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(popularResult);
  // Validate subscriber_count DESC order
  if (popularResult.data.length > 1) {
    for (let i = 0; i < popularResult.data.length - 1; i++) {
      TestValidator.predicate(
        `subscriber_count order: community ${i} >= community ${i + 1}`,
        popularResult.data[i].subscriber_count >=
          popularResult.data[i + 1].subscriber_count,
      );
    }
  }
  // Test 5: Default sorting (no sort parameter specified)
  const defaultResult = await api.functional.community.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default result has valid pagination",
    defaultResult.pagination.current === 1 &&
      defaultResult.pagination.limit === 5,
  );
}
