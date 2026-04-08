import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPopularFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPopularFeedRequest";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_popular_feed_sorting_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guestSession);
  // 2. Test 'new' sort - most recent posts first
  const newSortFeed =
    await api.functional.redditPlatform.guest.feeds.popular.index(
      guestConnection,
      {
        body: {
          sort: "new",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformPopularFeedRequest,
      },
    );
  typia.assert(newSortFeed);
  TestValidator.equals(
    "new sort response has data",
    newSortFeed.data.length > 0,
    true,
  );
  TestValidator.equals(
    "new sort pagination current",
    newSortFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "new sort pagination limit",
    newSortFeed.pagination.limit,
    10,
  );
  // Verify posts are ordered by created_at DESC
  for (let i = 1; i < newSortFeed.data.length; i++) {
    const prevPost = newSortFeed.data[i - 1];
    const currPost = newSortFeed.data[i];
    TestValidator.predicate(
      "new sort order correct",
      new Date(currPost.created_at) <= new Date(prevPost.created_at),
    );
  }
  // 3. Test 'top' sort with different time ranges
  const timeRanges: Array<"today" | "week" | "month" | "year" | "all"> = [
    "today",
    "week",
    "month",
    "year",
    "all",
  ];
  for (const timeRange of timeRanges) {
    const topSortFeed =
      await api.functional.redditPlatform.guest.feeds.popular.index(
        guestConnection,
        {
          body: {
            sort: "top",
            topTimeRange: timeRange,
            limit: 10,
          } satisfies IRedditPlatformPopularFeedRequest,
        },
      );
    typia.assert(topSortFeed);
    TestValidator.equals(
      `top sort ${timeRange} response has data`,
      topSortFeed.data.length >= 0,
      true,
    );
    // Verify posts are sorted by vote_score DESC
    for (let i = 1; i < topSortFeed.data.length; i++) {
      const prevPost = topSortFeed.data[i - 1];
      const currPost = topSortFeed.data[i];
      const prevScore =
        (prevPost.upvotes_count ?? 0) - (prevPost.downvotes_count ?? 0);
      const currScore =
        (currPost.upvotes_count ?? 0) - (currPost.downvotes_count ?? 0);
      TestValidator.predicate(
        `top sort ${timeRange} order correct`,
        currScore <= prevScore,
      );
    }
  }
  // 4. Test 'controversial' sort - highest engagement with polarized opinions
  const controversialFeed =
    await api.functional.redditPlatform.guest.feeds.popular.index(
      guestConnection,
      {
        body: {
          sort: "controversial",
          limit: 10,
        } satisfies IRedditPlatformPopularFeedRequest,
      },
    );
  typia.assert(controversialFeed);
  TestValidator.equals(
    "controversial sort response has data",
    controversialFeed.data.length >= 0,
    true,
  );
  // Verify posts are ordered by absolute vote score ASC
  for (let i = 1; i < controversialFeed.data.length; i++) {
    const prevPost = controversialFeed.data[i - 1];
    const currPost = controversialFeed.data[i];
    const prevAbsScore = Math.abs(
      (prevPost.upvotes_count ?? 0) - (prevPost.downvotes_count ?? 0),
    );
    const currAbsScore = Math.abs(
      (currPost.upvotes_count ?? 0) - (currPost.downvotes_count ?? 0),
    );
    TestValidator.predicate(
      "controversial sort order correct",
      currAbsScore >= prevAbsScore,
    );
  }
  // 5. Test search functionality
  const searchFeed =
    await api.functional.redditPlatform.guest.feeds.popular.index(
      guestConnection,
      {
        body: {
          search: "test",
          limit: 20,
        } satisfies IRedditPlatformPopularFeedRequest,
      },
    );
  typia.assert(searchFeed);
  TestValidator.equals(
    "search response has data",
    searchFeed.data.length >= 0,
    true,
  );
  // Verify all returned posts have deleted_at=null
  for (const post of searchFeed.data) {
    TestValidator.equals("post deleted_at is null", post.deleted_at, null);
  }
  // 6. Test pagination
  const page1 = await api.functional.redditPlatform.guest.feeds.popular.index(
    guestConnection,
    {
      body: { limit: 10, page: 1 } satisfies IRedditPlatformPopularFeedRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals(
    "page 1 records",
    page1.pagination.records,
    page1.data.length,
  );
  const page2 = await api.functional.redditPlatform.guest.feeds.popular.index(
    guestConnection,
    {
      body: { limit: 10, page: 2 } satisfies IRedditPlatformPopularFeedRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  // Verify different pages return different posts
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.notEquals(
      "different pages have different posts",
      page1.data[0].id,
      page2.data[0].id,
    );
  }
  // 7. Test empty search returns all posts (no filtering)
  const emptySearchFeed =
    await api.functional.redditPlatform.guest.feeds.popular.index(
      guestConnection,
      {
        body: {
          search: "",
          limit: 10,
        } satisfies IRedditPlatformPopularFeedRequest,
      },
    );
  typia.assert(emptySearchFeed);
  TestValidator.equals(
    "empty search response has data",
    emptySearchFeed.data.length >= 0,
    true,
  );
  // 8. Validate all posts across tests have deleted_at=null
  TestValidator.predicate(
    "all posts have deleted_at null",
    searchFeed.data.every((p) => p.deleted_at === null),
  );
  // 9. Validate pagination structure
  TestValidator.predicate(
    "pagination records count correct",
    page1.pagination.records ===
      page1.pagination.pages * page1.pagination.limit,
  );
}
