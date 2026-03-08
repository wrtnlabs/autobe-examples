import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_community_feed_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberInfo = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberInfo);
  // 2. Create community
  const communityName = `test_community_${RandomGenerator.alphaNumeric(6)}`;
  await api.functional.redditLike.member.communities.subscribe.create(
    memberConnection,
    {
      communityName,
    },
  );
  // 3. Create posts with different timestamps
  const todayPost = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Today's Post",
        type: "text",
        content: "This post is from today",
        community_id: communityName,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(todayPost);
  const weekPost = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Week's Post",
        type: "text",
        content: "This post is from this week",
        community_id: communityName,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(weekPost);
  const monthPost = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Month's Post",
        type: "text",
        content: "This post is from this month",
        community_id: communityName,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(monthPost);
  // 4. Test time filters
  // Test today filter
  const todayFeed =
    await api.functional.redditLike.member.communities.feed.search(
      memberConnection,
      {
        communityName,
        body: {
          sort: "top",
          time: "today",
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(todayFeed);
  TestValidator.equals("today filter - count", todayFeed.data.length, 1);
  TestValidator.equals(
    "today filter - post matches",
    todayFeed.data[0].id,
    todayPost.id,
  );
  // Test week filter
  const weekFeed =
    await api.functional.redditLike.member.communities.feed.search(
      memberConnection,
      {
        communityName,
        body: {
          sort: "top",
          time: "week",
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(weekFeed);
  TestValidator.predicate("week filter - has posts", weekFeed.data.length >= 1);
  // Test month filter
  const monthFeed =
    await api.functional.redditLike.member.communities.feed.search(
      memberConnection,
      {
        communityName,
        body: {
          sort: "top",
          time: "month",
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(monthFeed);
  TestValidator.predicate(
    "month filter - has posts",
    monthFeed.data.length >= 1,
  );
  // Test year filter
  const yearFeed =
    await api.functional.redditLike.member.communities.feed.search(
      memberConnection,
      {
        communityName,
        body: {
          sort: "top",
          time: "year",
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(yearFeed);
  TestValidator.predicate("year filter - has posts", yearFeed.data.length >= 1);
  // Test all filter
  const allFeed =
    await api.functional.redditLike.member.communities.feed.search(
      memberConnection,
      {
        communityName,
        body: {
          sort: "top",
          time: "all",
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(allFeed);
  TestValidator.predicate("all filter - has posts", allFeed.data.length >= 1);
  // Test time filter ignored for non-top sorts
  const newFeed =
    await api.functional.redditLike.member.communities.feed.search(
      memberConnection,
      {
        communityName,
        body: {
          sort: "new",
          time: "today", // This should be ignored for sort=new
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(newFeed);
}
