import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_member_home_feed_top_sort_with_time_period(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username: RandomGenerator.name(1),
        href: "http://localhost:3000/signup",
        referrer: "http://localhost:3000",
      } satisfies IRedditCommunityMember.IJoin,
    });
  typia.assert(member);
  // 2. Subscribe to a test community (using a known community ID)
  // In E2E tests, we assume test communities exist
  const testCommunityId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000001";
  const subscription: IRedditCommunitySubscription =
    await api.functional.redditCommunity.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: testCommunityId,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3. Test top sorting with different timePeriod values
  const timePeriods: Array<
    "today" | "this_week" | "this_month" | "this_year" | "all_time"
  > = ["today", "this_week", "this_month", "this_year", "all_time"];
  for (const timePeriod of timePeriods) {
    const feedResult =
      await api.functional.redditCommunity.member.feeds.home.index(
        memberConnection,
        {
          body: {
            sort: "top" as const,
            timePeriod,
            pageSize: 10,
          } satisfies IRedditCommunityPost.IRequest,
        },
      );
    typia.assert(feedResult);
    // Validate response structure
    TestValidator.equals(
      `feed with timePeriod=${timePeriod} has pagination`,
      feedResult.pagination !== undefined,
      true,
    );
    TestValidator.equals(
      `feed with timePeriod=${timePeriod} has data array`,
      feedResult.data !== undefined,
      true,
    );
    // Validate pagination metadata
    const pagination = feedResult.pagination;
    TestValidator.predicate(
      `pagination has current page`,
      pagination.current >= 1,
    );
    TestValidator.predicate(`pagination has limit`, pagination.limit >= 1);
    TestValidator.predicate(
      `pagination has records count`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination has pages count`,
      pagination.pages >= 0,
    );
    // Validate posts are sorted by vote_score DESC (if posts exist)
    if (feedResult.data.length > 1) {
      for (let i = 1; i < feedResult.data.length; i++) {
        const prevScore = feedResult.data[i - 1].vote_score;
        const currScore = feedResult.data[i].vote_score;
        TestValidator.predicate(
          `posts sorted by vote_score DESC for timePeriod=${timePeriod}`,
          prevScore >= currScore,
        );
      }
    }
    // Validate each post has required fields
    for (const post of feedResult.data) {
      typia.assert(post);
      TestValidator.predicate(
        `post ${post.id} has valid vote_score`,
        typeof post.vote_score === "number",
      );
      TestValidator.predicate(
        `post ${post.id} has valid created_at`,
        post.created_at !== undefined,
      );
      TestValidator.predicate(
        `post ${post.id} has author`,
        post.author !== undefined,
      );
      TestValidator.predicate(
        `post ${post.id} has community`,
        post.community !== undefined,
      );
    }
  }
  // 4. Test default sort (hot) when no sort parameter provided
  const defaultFeedResult =
    await api.functional.redditCommunity.member.feeds.home.index(
      memberConnection,
      {
        body: {
          pageSize: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(defaultFeedResult);
  TestValidator.equals(
    "default feed has pagination",
    defaultFeedResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "default feed has data",
    defaultFeedResult.data !== undefined,
    true,
  );
  // 5. Test with explicit sort='hot' (default)
  const hotFeedResult =
    await api.functional.redditCommunity.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort: "hot" as const,
          pageSize: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(hotFeedResult);
  TestValidator.equals(
    "hot feed has pagination",
    hotFeedResult.pagination !== undefined,
    true,
  );
  // 6. Test with sort='new'
  const newFeedResult =
    await api.functional.redditCommunity.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort: "new" as const,
          pageSize: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(newFeedResult);
  TestValidator.equals(
    "new feed has pagination",
    newFeedResult.pagination !== undefined,
    true,
  );
  // 7. Test pagination with different page and limit values
  const paginatedResult =
    await api.functional.redditCommunity.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort: "top" as const,
          timePeriod: "this_week" as const,
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "paginated feed has correct current page",
    paginatedResult.pagination.current === 1,
    true,
  );
  TestValidator.equals(
    "paginated feed has correct limit",
    paginatedResult.pagination.limit === 20,
    true,
  );
  // 8. Validate that timePeriod filter affects results
  // Call with 'today' and compare with 'this_week'
  const todayFeed =
    await api.functional.redditCommunity.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort: "top" as const,
          timePeriod: "today" as const,
          pageSize: 100,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(todayFeed);
  const thisWeekFeed =
    await api.functional.redditCommunity.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort: "top" as const,
          timePeriod: "this_week" as const,
          pageSize: 100,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(thisWeekFeed);
  // Validate that all_time should return all posts
  const allTimeFeed =
    await api.functional.redditCommunity.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort: "top" as const,
          timePeriod: "all_time" as const,
          pageSize: 100,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(allTimeFeed);
  // Validate that records count is consistent
  TestValidator.equals(
    "all_time has more or equal posts than this_week",
    allTimeFeed.pagination.records >= thisWeekFeed.pagination.records,
    true,
  );
}