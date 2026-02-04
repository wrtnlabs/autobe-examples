import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_posts_community_feed_public(
  connection: api.IConnection,
) {
  // Generate a random feed request with community feed type
  const feedRequest = {
    feedType: "community",
    sortCriteria: "new",
    timeFilter: "all_time",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformPost.IRequest;
  // Fetch community platform posts feed
  const feedResponse: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: feedRequest,
    });
  typia.assert(feedResponse);
  // Validate pagination structure - current page 1, limit 10
  TestValidator.equals(
    "pagination current should be 1",
    feedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    feedResponse.pagination.limit,
    10,
  );
  // Validate initial state - no posts available in the community feed
  TestValidator.equals(
    "empty data array for community feed",
    feedResponse.data.length,
    0,
  );
}
