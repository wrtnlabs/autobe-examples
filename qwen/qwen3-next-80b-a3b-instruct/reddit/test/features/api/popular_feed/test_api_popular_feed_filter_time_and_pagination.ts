import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_popular_feed_filter_time_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Strategic test planning for popular feed time filtering and pagination
  // - Test top algorithm with timeFilter='week' (should include posts from last 7 days)
  // - Verify pagination: page=1, limit=10 returns first 10 posts
  // - Verify pagination: page=2, limit=10 returns next 10 posts
  // - Verify total records count reflects posts from last 7 days only
  // - Verify posts older than 7 days are excluded from results
  // Test time filtering with 'week' and 'top' algorithm
  const response1 =
    await api.functional.redditCommunity.analytics.posts.popular.index(
      connection,
      {
        body: {
          sort: "top",
          timeFilter: "week",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(response1);
  // Validate pagination and time filtering
  TestValidator.equals(
    "response pagination current",
    response1.pagination.current,
    1,
  );
  TestValidator.equals(
    "response pagination limit",
    response1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "response pagination records > 0",
    response1.pagination.records > 0,
  );
  TestValidator.predicate(
    "response pagination pages >= 1",
    response1.pagination.pages >= 1,
  );
  TestValidator.equals("response data count", response1.data.length, 10);
  // Validate all returned posts are from the last 7 days (week timeframe)
  for (const post of response1.data) {
    const postDate = new Date(post.createdAt);
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    // Posts should be from within the last 7 days
    TestValidator.predicate("post timestamp within last 7 days", daysDiff <= 7);
  }
  // Test second page
  const response2 =
    await api.functional.redditCommunity.analytics.posts.popular.index(
      connection,
      {
        body: {
          sort: "top",
          timeFilter: "week",
          page: 2,
          limit: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(response2);
  // Validate second page pagination
  TestValidator.equals(
    "second page pagination current",
    response2.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page pagination limit",
    response2.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "second page pagination records > 0",
    response2.pagination.records > 0,
  );
  TestValidator.predicate(
    "second page pagination pages >= 2",
    response2.pagination.pages >= 2,
  );
  TestValidator.equals("second page data count", response2.data.length, 10);
  // Validate all second page posts are from the last 7 days
  for (const post of response2.data) {
    const postDate = new Date(post.createdAt);
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    TestValidator.predicate(
      "second page post timestamp within last 7 days",
      daysDiff <= 7,
    );
  }
  // Test total count consistency: page1 + page2 should equal total count
  const allResponse =
    await api.functional.redditCommunity.analytics.posts.popular.index(
      connection,
      {
        body: {
          sort: "top",
          timeFilter: "week",
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(allResponse);
  // We expect at least 20 posts from week filter
  TestValidator.predicate(
    "total posts in week filter >= 20",
    allResponse.pagination.records >= 20,
  );
  TestValidator.equals(
    "all response data count",
    allResponse.data.length,
    allResponse.pagination.records,
  );
}
