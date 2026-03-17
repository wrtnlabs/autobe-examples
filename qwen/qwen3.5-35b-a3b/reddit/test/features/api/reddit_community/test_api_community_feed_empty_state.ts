import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFeedCache";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test community feed endpoint with empty state scenarios.
 * Validates that the feed endpoint returns correct empty response structure
 * when a community has no posts or all posts are deleted.
 */
export async function test_api_community_feed_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test with random community ID that may have no posts
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const emptyFeed = await api.functional.redditCommunity.communities.feed.index(
    connection,
    {
      communityId,
      body: {
        page: 1,
        limit: 20,
        sortType: "new",
      },
    },
  );
  typia.assert(emptyFeed);
  // 2. Verify pagination metadata for empty state
  TestValidator.equals(
    "empty feed pagination - current page",
    emptyFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty feed pagination - limit",
    emptyFeed.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty feed pagination - records",
    emptyFeed.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty feed pagination - pages",
    emptyFeed.pagination.pages,
    0,
  );
  // 3. Verify empty data array
  TestValidator.equals("empty feed data array", emptyFeed.data, []);
  // 4. Test with different sort types for empty community
  const sortTypes: ("hot" | "new" | "top" | "controversial")[] = [
    "hot",
    "new",
    "top",
    "controversial",
  ];
  for (const sortType of sortTypes) {
    const sortedFeed =
      await api.functional.redditCommunity.communities.feed.index(connection, {
        communityId,
        body: {
          page: 1,
          limit: 10,
          sortType,
          timeFilter: sortType === "top" ? "all" : undefined,
        },
      });
    typia.assert(sortedFeed);
    TestValidator.equals(
      `sort type ${sortType} pagination - records`,
      sortedFeed.pagination.records,
      0,
    );
    TestValidator.equals(
      `sort type ${sortType} pagination - pages`,
      sortedFeed.pagination.pages,
      0,
    );
    TestValidator.equals(
      `sort type ${sortType} data array empty`,
      sortedFeed.data,
      [],
    );
  }
  // 5. Test with different pagination values
  const paginationTests = [
    { page: 1, limit: 1 },
    { page: 5, limit: 50 },
    { page: 10, limit: 100 },
  ];
  for (const { page, limit } of paginationTests) {
    const paginatedFeed =
      await api.functional.redditCommunity.communities.feed.index(connection, {
        communityId,
        body: { page, limit },
      });
    typia.assert(paginatedFeed);
    TestValidator.equals(
      `pagination ${page}/${limit} - records`,
      paginatedFeed.pagination.records,
      0,
    );
    TestValidator.equals(
      `pagination ${page}/${limit} - pages`,
      paginatedFeed.pagination.pages,
      0,
    );
    TestValidator.equals(
      `pagination ${page}/${limit} - current page`,
      paginatedFeed.pagination.current,
      page,
    );
    TestValidator.equals(
      `pagination ${page}/${limit} - limit`,
      paginatedFeed.pagination.limit,
      limit,
    );
  }
}
