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

export async function test_api_posts_popular_feed_public(
  connection: api.IConnection,
): Promise<void> {
  const request: ICommunityPlatformPost.IRequest = {
    feedType: "popular",
    sortCriteria: "top",
    timeFilter: "all_time",
    page: 1,
    limit: 10,
  };
  const feed: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: request,
    });
  typia.assert(feed);
  TestValidator.equals("pagination current", feed.pagination.current, 1);
  TestValidator.equals("pagination limit", feed.pagination.limit, 10);
  TestValidator.notEquals("pagination records", feed.pagination.records, 0);
  TestValidator.notEquals("pagination pages", feed.pagination.pages, 0);
  TestValidator.notEquals("data should contain posts", feed.data.length, 0);
}
