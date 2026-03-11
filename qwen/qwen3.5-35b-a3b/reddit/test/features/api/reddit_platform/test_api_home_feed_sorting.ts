import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { generate_random_reddit_platform_member_subscriptions_subscribe } from "../../../generate/generate_random_reddit_platform_member_subscriptions_subscribe";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";

export async function test_api_home_feed_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "password123",
      displayName: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create community for testing
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: `test-community-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  await generate_random_reddit_platform_member_subscriptions_subscribe(
    memberConnection,
    {
      body: {
        reddit_platform_community_id: community.id,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
    },
  );
  // 4. Test 'new' sort - validate response structure
  const newSortResponse =
    await api.functional.redditPlatform.member.posts.feed.home.index(
      memberConnection,
      {
        body: {
          sortOrder: "new",
          page: 1,
          pageSize: 100,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(newSortResponse);
  TestValidator.equals(
    "new sort - response has pagination",
    !!newSortResponse.pagination,
    true,
  );
  TestValidator.equals(
    "new sort - data is array",
    Array.isArray(newSortResponse.data),
    true,
  );
  // 5. Test 'top' sort with all_time
  const topAllTimeResponse =
    await api.functional.redditPlatform.member.posts.feed.home.index(
      memberConnection,
      {
        body: {
          sortOrder: "top",
          timeRange: "all_time",
          page: 1,
          pageSize: 100,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(topAllTimeResponse);
  TestValidator.equals(
    "top sort all_time - response valid",
    !!topAllTimeResponse,
    true,
  );
  // 6. Test 'top' sort with this_week
  const topWeekResponse =
    await api.functional.redditPlatform.member.posts.feed.home.index(
      memberConnection,
      {
        body: {
          sortOrder: "top",
          timeRange: "this_week",
          page: 1,
          pageSize: 100,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(topWeekResponse);
  TestValidator.equals(
    "top sort this_week - response valid",
    !!topWeekResponse,
    true,
  );
  // 7. Test 'top' sort with this_month
  const topMonthResponse =
    await api.functional.redditPlatform.member.posts.feed.home.index(
      memberConnection,
      {
        body: {
          sortOrder: "top",
          timeRange: "this_month",
          page: 1,
          pageSize: 100,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(topMonthResponse);
  TestValidator.equals(
    "top sort this_month - response valid",
    !!topMonthResponse,
    true,
  );
  // 8. Test 'top' sort with this_year
  const topYearResponse =
    await api.functional.redditPlatform.member.posts.feed.home.index(
      memberConnection,
      {
        body: {
          sortOrder: "top",
          timeRange: "this_year",
          page: 1,
          pageSize: 100,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(topYearResponse);
  TestValidator.equals(
    "top sort this_year - response valid",
    !!topYearResponse,
    true,
  );
  // 9. Test 'hot' sort
  const hotSortResponse =
    await api.functional.redditPlatform.member.posts.feed.home.index(
      memberConnection,
      {
        body: {
          sortOrder: "hot",
          page: 1,
          pageSize: 100,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(hotSortResponse);
  TestValidator.equals(
    "hot sort - response has data array",
    Array.isArray(hotSortResponse.data),
    true,
  );
  // 10. Test 'controversial' sort
  const controversialResponse =
    await api.functional.redditPlatform.member.posts.feed.home.index(
      memberConnection,
      {
        body: {
          sortOrder: "controversial",
          page: 1,
          pageSize: 100,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(controversialResponse);
  TestValidator.equals(
    "controversial sort - response valid",
    !!controversialResponse,
    true,
  );
  // 11. Validate pagination structure across all responses
  TestValidator.equals(
    "new sort - pagination current page",
    newSortResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "new sort - pagination limit is positive",
    newSortResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "new sort - pagination records is non-negative",
    newSortResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "new sort - pagination pages is non-negative",
    newSortResponse.pagination.pages >= 0,
  );
  // 12. Validate response structure for top sort
  TestValidator.equals(
    "top all_time - pagination current page",
    topAllTimeResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "top week - pagination current page",
    topWeekResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "hot sort - pagination current page",
    hotSortResponse.pagination.current,
    1,
  );
  // 13. Validate post structure when data exists
  if (newSortResponse.data.length > 0) {
    const firstPost = newSortResponse.data[0];
    typia.assert(firstPost);
    TestValidator.equals("post has id", !!firstPost.id, true);
    TestValidator.equals("post has title", !!firstPost.title, true);
    TestValidator.equals("post has author", !!firstPost.author, true);
    TestValidator.equals("post has community", !!firstPost.community, true);
    TestValidator.equals(
      "post has vote_score",
      typeof firstPost.vote_score === "number",
      true,
    );
    TestValidator.equals("post has created_at", !!firstPost.created_at, true);
  }
  // 14. Test edge case - no sorting preference
  const noSortResponse =
    await api.functional.redditPlatform.member.posts.feed.home.index(
      memberConnection,
      {
        body: {
          page: 1,
          pageSize: 50,
        } satisfies IRedditPlatformPostFeedRequest,
      },
    );
  typia.assert(noSortResponse);
  TestValidator.equals("no sort - response valid", !!noSortResponse, true);
}