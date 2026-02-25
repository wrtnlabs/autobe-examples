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

export async function test_api_reddit_clone_guest_analytics_posts_top_time_filter_combinations(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest session for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await api.functional.redditClone.auth.guest.join(
    guestConnection,
    {
      body: {
        session_token: typia.random<string & tags.Format<"uuid">>(),
        device_id: typia.random<string & tags.Format<"uuid">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneGuest.IJoin,
    },
  );
  typia.assert(guestSession);
  // Step 2: Test top sorting with today time filter
  const todayResult =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 10,
          timeFilter: "today",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(todayResult);
  // Step 3: Test top sorting with week time filter
  const weekResult =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 10,
          timeFilter: "week",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(weekResult);
  // Step 4: Test top sorting with month time filter
  const monthResult =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 10,
          timeFilter: "month",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(monthResult);
  // Step 5: Test top sorting with year time filter
  const yearResult =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 10,
          timeFilter: "year",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(yearResult);
  // Step 6: Test top sorting with allTime time filter
  const allTimeResult =
    await api.functional.redditClone.guest.analytics.posts.top.index(
      guestConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 10,
          timeFilter: "allTime",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(allTimeResult);
  // Step 7: Verify pagination works correctly
  TestValidator.equals(
    "pagination current page",
    todayResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", todayResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has valid records",
    todayResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    todayResult.pagination.pages >= 0,
  );
  // Step 8: Verify data structure
  TestValidator.predicate("has data array", Array.isArray(todayResult.data));
  TestValidator.equals(
    "data length matches limit",
    todayResult.data.length,
    todayResult.pagination.limit,
  );
  // Step 9: Verify post summary structure
  if (todayResult.data.length > 0) {
    const firstPost = todayResult.data[0];
    typia.assert<IRedditCloneContentPost.ISummary>(firstPost);
    TestValidator.equals("post has valid id", typeof firstPost.id, "string");
    TestValidator.equals(
      "post has valid title",
      typeof firstPost.title,
      "string",
    );
    TestValidator.equals(
      "post has valid voteScore",
      typeof firstPost.voteScore,
      "number",
    );
    TestValidator.equals(
      "post has valid commentCount",
      typeof firstPost.commentCount,
      "number",
    );
  }
}
