import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_reddit_clone_guest_analytics_posts_top(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication setup
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      session_token: typia.random<string & tags.Format<"uuid">>(),
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test top posts analytics endpoint with various sorting algorithms
  // Hot sorting test
  const hotResponse =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "hot",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(hotResponse);
  TestValidator.predicate("has data", hotResponse.data.length > 0);
  TestValidator.predicate("has pagination", hotResponse.pagination.records > 0);
  // New sorting test
  const newResponse =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "new",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(newResponse);
  TestValidator.predicate("new sorting has data", newResponse.data.length > 0);
  // Top sorting test
  const topResponse =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(topResponse);
  TestValidator.predicate("top sorting has data", topResponse.data.length > 0);
  // Controversial sorting test
  const controversialResponse =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "controversial",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(controversialResponse);
  TestValidator.predicate(
    "controversial sorting has data",
    controversialResponse.data.length > 0,
  );
  // 3. Test pagination parameters
  const paginatedResponse =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "hot",
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals("pagination limit", paginatedResponse.data.length, 5);
  TestValidator.equals(
    "pagination current",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResponse.pagination.limit,
    5,
  );
  // 4. Test time filter for top sorting
  const topTodayResponse =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 10,
          timeFilter: "today",
        },
      },
    );
  typia.assert(topTodayResponse);
  TestValidator.predicate(
    "top today has data",
    topTodayResponse.data.length > 0,
  );
  const topWeekResponse =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 10,
          timeFilter: "week",
        },
      },
    );
  typia.assert(topWeekResponse);
  TestValidator.predicate("top week has data", topWeekResponse.data.length > 0);
  const topMonthResponse =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 10,
          timeFilter: "month",
        },
      },
    );
  typia.assert(topMonthResponse);
  TestValidator.predicate(
    "top month has data",
    topMonthResponse.data.length > 0,
  );
  const topYearResponse =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 10,
          timeFilter: "year",
        },
      },
    );
  typia.assert(topYearResponse);
  TestValidator.predicate("top year has data", topYearResponse.data.length > 0);
  const topAllTimeResponse =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 10,
          timeFilter: "allTime",
        },
      },
    );
  typia.assert(topAllTimeResponse);
  TestValidator.predicate(
    "top all time has data",
    topAllTimeResponse.data.length > 0,
  );
  // 5. Test post structure validation
  const firstPost = hotResponse.data[0];
  if (firstPost) {
    TestValidator.equals("post has id", typeof firstPost.id, "string");
    TestValidator.equals("post has title", typeof firstPost.title, "string");
    TestValidator.equals(
      "post has author",
      firstPost.author !== undefined,
      true,
    );
    TestValidator.equals(
      "post has community",
      firstPost.community !== undefined,
      true,
    );
    TestValidator.predicate(
      "post has valid vote score",
      firstPost.voteScore >= 0,
    );
    TestValidator.predicate(
      "post has valid comment count",
      firstPost.commentCount >= 0,
    );
    TestValidator.predicate(
      "post has valid view count",
      firstPost.viewCount >= 0,
    );
    TestValidator.predicate(
      "post has valid upvote count",
      firstPost.upvoteCount >= 0,
    );
    TestValidator.predicate(
      "post has valid downvote count",
      firstPost.downvoteCount >= 0,
    );
    TestValidator.equals(
      "post has time ago",
      typeof firstPost.timeAgo,
      "string",
    );
    TestValidator.predicate(
      "post has trending score",
      firstPost.trendingScore >= 0,
    );
    TestValidator.predicate(
      "post has engagement rate",
      firstPost.engagementRate >= 0,
    );
    TestValidator.equals(
      "post has created_at",
      firstPost.created_at !== undefined,
      true,
    );
  }
}
