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

export async function test_api_hot_posts_analytics_parameters(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      session_token: typia.random<string & tags.Format<"uuid">>(),
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: null,
    } satisfies IRedditCloneGuest.IJoin,
  });
  // Test 1: Hot sorting with pagination
  const hotFeed =
    await api.functional.redditClone.guest.analytics.posts.hot.index(
      guestConnection,
      {
        body: {
          sort: "hot",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(hotFeed);
  TestValidator.equals(
    "pagination exists",
    hotFeed.pagination !== undefined,
    true,
  );
  TestValidator.predicate("has data array", Array.isArray(hotFeed.data));
  // Test 2: New sorting algorithm
  const newFeed =
    await api.functional.redditClone.guest.analytics.posts.hot.index(
      guestConnection,
      {
        body: {
          sort: "new",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(newFeed);
  // Test 3: Top sorting with time filter
  const topFeed =
    await api.functional.redditClone.guest.analytics.posts.hot.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 15,
          timeFilter: "week",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(topFeed);
  // Test 4: Controversial sorting
  const controversialFeed =
    await api.functional.redditClone.guest.analytics.posts.hot.index(
      guestConnection,
      {
        body: {
          sort: "controversial",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(controversialFeed);
  // Test 5: Pagination with different page numbers
  const page2Feed =
    await api.functional.redditClone.guest.analytics.posts.hot.index(
      guestConnection,
      {
        body: {
          sort: "hot",
          page: 2,
          limit: 10,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(page2Feed);
  // Test 6: Maximum limit
  const maxLimitFeed =
    await api.functional.redditClone.guest.analytics.posts.hot.index(
      guestConnection,
      {
        body: {
          sort: "hot",
          page: 1,
          limit: 100,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(maxLimitFeed);
  // Test 7: Top sorting with different time filters
  const timeFilterTests = ["today", "month", "year", "allTime"] as const;
  for (const timeFilter of timeFilterTests) {
    const timeFilteredFeed =
      await api.functional.redditClone.guest.analytics.posts.hot.index(
        guestConnection,
        {
          body: {
            sort: "top",
            page: 1,
            limit: 10,
            timeFilter: timeFilter,
          } satisfies IRedditCloneContentPost.IRequest,
        },
      );
    typia.assert(timeFilteredFeed);
  }
  // Test 8: Verify response structure
  const structureTest =
    await api.functional.redditClone.guest.analytics.posts.hot.index(
      guestConnection,
      {
        body: {
          sort: "hot",
          page: 1,
          limit: 5,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(structureTest);
  // Validate pagination structure
  TestValidator.equals(
    "pagination fields",
    typeof structureTest.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit",
    typeof structureTest.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records",
    typeof structureTest.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages",
    typeof structureTest.pagination.pages,
    "number",
  );
  // Validate data array structure
  if (structureTest.data.length > 0) {
    const firstPost = structureTest.data[0];
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
    TestValidator.equals(
      "post has voteScore",
      typeof firstPost.voteScore,
      "number",
    );
    TestValidator.equals(
      "post has commentCount",
      typeof firstPost.commentCount,
      "number",
    );
    TestValidator.equals(
      "post has viewCount",
      typeof firstPost.viewCount,
      "number",
    );
    TestValidator.equals(
      "post has upvoteCount",
      typeof firstPost.upvoteCount,
      "number",
    );
    TestValidator.equals(
      "post has downvoteCount",
      typeof firstPost.downvoteCount,
      "number",
    );
    TestValidator.equals(
      "post has timeAgo",
      typeof firstPost.timeAgo,
      "string",
    );
    TestValidator.equals(
      "post has trendingScore",
      typeof firstPost.trendingScore,
      "number",
    );
    TestValidator.equals(
      "post has engagementRate",
      typeof firstPost.engagementRate,
      "number",
    );
  }
}
