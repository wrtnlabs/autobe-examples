import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_home_feed_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create multiple communities
  const communities = await ArrayUtil.asyncRepeat(3, async () => {
    const community =
      await generate_random_reddit_like_member_communities_create(
        memberConnection,
        {
          body: {
            name: `community_${RandomGenerator.alphabets(5)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IRedditLikeCommunity.ICreate,
        },
      );
    typia.assert(community);
    return community;
  });
  // 3. Subscribe to all communities
  await ArrayUtil.asyncForEach(communities, async (community) => {
    const subscription =
      await generate_random_reddit_like_member_subscriptions_create(
        memberConnection,
        {
          body: {
            communityId: community.id,
          } satisfies IRedditLikeCommunitySubscription.ICreate,
        },
      );
    typia.assert(subscription);
  });
  // 4. Create multiple posts with varying vote scores and times
  const posts = await ArrayUtil.asyncRepeat(10, async (index) => {
    const community = RandomGenerator.pick(communities);
    const post = await generate_random_reddit_like_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          title: `Post ${index + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
          content_type: "text",
          content_text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });
  // 5. Test 'new' sorting - posts ordered by creation time (newest first)
  const newFeed = await api.functional.redditLike.member.feeds.home.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "new",
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(newFeed);
  TestValidator.predicate("new sorting returns posts", newFeed.data.length > 0);
  // Verify newest posts come first
  for (let i = 1; i < newFeed.data.length; i++) {
    TestValidator.predicate(
      `post ${i} is newer than post ${i - 1}`,
      new Date(newFeed.data[i].created_at) <=
        new Date(newFeed.data[i - 1].created_at),
    );
  }
  // 6. Test 'hot' sorting - posts ordered by engagement and recency
  const hotFeed = await api.functional.redditLike.member.feeds.home.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "hot",
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(hotFeed);
  TestValidator.predicate("hot sorting returns posts", hotFeed.data.length > 0);
  // 7. Test 'top' sorting with different time filters
  const timeFilters = ["today", "week", "month", "year", "all_time"] as const;
  await ArrayUtil.asyncForEach(timeFilters, async (timeFilter) => {
    const topFeed = await api.functional.redditLike.member.feeds.home.index(
      memberConnection,
      {
        body: {
          feed_type: "home",
          sort: "top",
          time_filter: timeFilter,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
    typia.assert(topFeed);
    TestValidator.predicate(
      `top sorting with ${timeFilter} returns posts`,
      topFeed.data.length > 0,
    );
    // Verify highest vote scores come first
    for (let i = 1; i < topFeed.data.length; i++) {
      TestValidator.predicate(
        `post ${i} has score <= post ${i - 1} for ${timeFilter}`,
        topFeed.data[i].vote_score <= topFeed.data[i - 1].vote_score,
      );
    }
  });
  // 8. Test 'controversial' sorting - posts with high vote variance
  const controversialFeed =
    await api.functional.redditLike.member.feeds.home.index(memberConnection, {
      body: {
        feed_type: "home",
        sort: "controversial",
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial sorting returns posts",
    controversialFeed.data.length > 0,
  );
}
