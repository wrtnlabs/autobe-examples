import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_popular_time_filtered_top_posts_weekly(
  connection: api.IConnection,
): Promise<void> {
  const feedResponse: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.feed.popular.index(connection, {
      body: {
        sort: "top",
        timeFilter: "week",
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(feedResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    feedResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", feedResponse.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 0",
    feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    feedResponse.pagination.pages >= 0,
  );
  // Validate data is array
  TestValidator.predicate(
    "data is non-null array",
    Array.isArray(feedResponse.data),
  );
}
