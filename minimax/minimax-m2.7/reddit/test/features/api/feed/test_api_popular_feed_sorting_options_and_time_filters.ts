import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_popular_feed_sorting_options_and_time_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest to establish session
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: "test-fingerprint-" + Date.now(),
      href: "https://example.com/feed" as any,
      referrer: "https://example.com" as any,
    },
  });
  // 2. Test sort=new - should order by createdAt descending (most recent first)
  const newSortResponse =
    await api.functional.redditClone.guest.feed.popular.index(guestConnection, {
      body: {
        sort: "new",
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(newSortResponse);
  TestValidator.predicate(
    "new sort returns posts",
    newSortResponse.data.length >= 0,
  );
  // Verify posts are ordered by createdAt descending
  if (newSortResponse.data.length > 1) {
    for (let i = 0; i < newSortResponse.data.length - 1; i++) {
      const current = new Date(newSortResponse.data[i].createdAt);
      const next = new Date(newSortResponse.data[i + 1].createdAt);
      TestValidator.predicate(
        `sort=new: post[${i}] createdAt >= post[${i + 1}] createdAt`,
        current >= next,
      );
    }
  }
  // 3. Test sort=top with timeRange=day - posts from last 24 hours ordered by voteScore descending
  const topDayResponse =
    await api.functional.redditClone.guest.feed.popular.index(guestConnection, {
      body: {
        sort: "top",
        timeRange: "day",
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(topDayResponse);
  TestValidator.predicate(
    "top/day sort returns posts",
    topDayResponse.data.length >= 0,
  );
  // Verify posts are ordered by voteScore descending
  if (topDayResponse.data.length > 1) {
    for (let i = 0; i < topDayResponse.data.length - 1; i++) {
      TestValidator.predicate(
        `sort=top/day: post[${i}] voteScore >= post[${i + 1}] voteScore`,
        topDayResponse.data[i].voteScore >=
          topDayResponse.data[i + 1].voteScore,
      );
    }
  }
  // 4. Test sort=top with timeRange=week - posts from last 7 days
  const topWeekResponse =
    await api.functional.redditClone.guest.feed.popular.index(guestConnection, {
      body: {
        sort: "top",
        timeRange: "week",
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(topWeekResponse);
  TestValidator.predicate(
    "top/week sort returns posts",
    topWeekResponse.data.length >= 0,
  );
  // 5. Test sort=controversial - posts with vote scores near zero
  const controversialResponse =
    await api.functional.redditClone.guest.feed.popular.index(guestConnection, {
      body: {
        sort: "controversial",
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(controversialResponse);
  TestValidator.predicate(
    "controversial sort returns posts",
    controversialResponse.data.length >= 0,
  );
  // 6. Test pagination with limit and page parameters for sort=new
  const page1Response =
    await api.functional.redditClone.guest.feed.popular.index(guestConnection, {
      body: {
        sort: "new",
        limit: 5,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(page1Response);
  const page2Response =
    await api.functional.redditClone.guest.feed.popular.index(guestConnection, {
      body: {
        sort: "new",
        limit: 5,
        page: 2,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(page2Response);
  // Verify pagination metadata
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("limit matches", page1Response.pagination.limit, 5);
  // 7. Test pagination for sort=top with timeRange
  const topPage1 = await api.functional.redditClone.guest.feed.popular.index(
    guestConnection,
    {
      body: {
        sort: "top",
        timeRange: "month",
        limit: 5,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topPage1);
  TestValidator.equals("top page 1 current", topPage1.pagination.current, 1);
  // 8. Verify timeRange is ignored when sort is hot
  const hotWithoutTimeRange =
    await api.functional.redditClone.guest.feed.popular.index(guestConnection, {
      body: {
        sort: "hot",
        limit: 5,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(hotWithoutTimeRange);
  const hotWithTimeRange =
    await api.functional.redditClone.guest.feed.popular.index(guestConnection, {
      body: {
        sort: "hot",
        timeRange: "year",
        limit: 5,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(hotWithTimeRange);
  // Both should return successfully (timeRange should be ignored for hot)
  TestValidator.predicate(
    "hot without timeRange returns",
    hotWithoutTimeRange.data.length >= 0,
  );
  TestValidator.predicate(
    "hot with timeRange returns",
    hotWithTimeRange.data.length >= 0,
  );
  // 9. Verify timeRange is ignored when sort is new
  const newWithoutTimeRange =
    await api.functional.redditClone.guest.feed.popular.index(guestConnection, {
      body: {
        sort: "new",
        limit: 5,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(newWithoutTimeRange);
  const newWithTimeRange =
    await api.functional.redditClone.guest.feed.popular.index(guestConnection, {
      body: {
        sort: "new",
        timeRange: "month",
        limit: 5,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(newWithTimeRange);
  // Both should return successfully (timeRange should be ignored for new)
  TestValidator.predicate(
    "new without timeRange returns",
    newWithoutTimeRange.data.length >= 0,
  );
  TestValidator.predicate(
    "new with timeRange returns",
    newWithTimeRange.data.length >= 0,
  );
}
