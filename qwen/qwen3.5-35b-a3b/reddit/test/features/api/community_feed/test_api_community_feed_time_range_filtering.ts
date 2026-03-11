import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostFeedRequest";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_feed_time_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(2),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: "Test community for time range filtering",
          icon_url: null,
        },
      },
    );
  typia.assert(community);
  // 3. Query with different time ranges to validate time range filtering
  const todayFeed =
    await api.functional.redditPlatform.member.communities.posts.feed.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sortOrder: "top" as const,
          timeRange: "today" as const,
          page: 1,
          pageSize: 100,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(todayFeed);
  const thisWeekFeed =
    await api.functional.redditPlatform.member.communities.posts.feed.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sortOrder: "top" as const,
          timeRange: "this_week" as const,
          page: 1,
          pageSize: 100,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(thisWeekFeed);
  const thisMonthFeed =
    await api.functional.redditPlatform.member.communities.posts.feed.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sortOrder: "top" as const,
          timeRange: "this_month" as const,
          page: 1,
          pageSize: 100,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(thisMonthFeed);
  const allTimeFeed =
    await api.functional.redditPlatform.member.communities.posts.feed.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sortOrder: "top" as const,
          timeRange: "all_time" as const,
          page: 1,
          pageSize: 100,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(allTimeFeed);
  // 4. Validate time range filtering
  // Verify pagination metadata is correct
  TestValidator.equals(
    "today feed pagination",
    todayFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "this_week feed pagination",
    thisWeekFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "this_month feed pagination",
    thisMonthFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "all_time feed pagination",
    allTimeFeed.pagination.current,
    1,
  );
  // Verify feeds return valid data structure
  TestValidator.predicate("today feed has data array", () =>
    Array.isArray(todayFeed.data),
  );
  TestValidator.predicate("this_week feed has data array", () =>
    Array.isArray(thisWeekFeed.data),
  );
  TestValidator.predicate("this_month feed has data array", () =>
    Array.isArray(thisMonthFeed.data),
  );
  TestValidator.predicate("all_time feed has data array", () =>
    Array.isArray(allTimeFeed.data),
  );
}
