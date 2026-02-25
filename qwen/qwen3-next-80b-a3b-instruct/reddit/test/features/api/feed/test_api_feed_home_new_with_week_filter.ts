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
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_feed_home_new_with_week_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create two communities
  const subscribedCommunity =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  const unsubscribedCommunity =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  // 3. Subscribe member to first community
  await api.functional.redditCommunity.member.communities.subscribe.create(
    memberConnection,
    {
      communityId: subscribedCommunity.id,
    },
  );
  // 4. Create recent post in subscribed community (within last week)
  const recentPostInSubscribed =
    await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          community_id: subscribedCommunity.id,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  // 5. Create recent post in unsubscribed community (within last week)
  const recentPostInUnsubscribed =
    await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          community_id: unsubscribedCommunity.id,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  // 6. Retrieve home feed with sort='new' and timeFilter='week'
  const feedResponse =
    await api.functional.redditCommunity.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort: "new",
          timeFilter: "week",
          limit: 10,
          page: 2,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(feedResponse);
  // 7. Validate response: only subscribed community posts and within last week
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // The feed should only contain posts from subscribed communities
  // We should have exactly 1 post from our subscribed community (the only recent one we created)
  TestValidator.equals(
    "exactly one post returned",
    feedResponse.data.length,
    1,
  );
  const post = feedResponse.data[0];
  // Must be from subscribed community
  TestValidator.equals(
    "post from subscribed community",
    post.community.id,
    subscribedCommunity.id,
  );
  // Must be within last week
  const postDate = new Date(post.createdAt);
  TestValidator.predicate(
    "post created within last week",
    postDate >= oneWeekAgo,
  );
  // Must NOT be from unsubscribed community
  TestValidator.notEquals(
    "post not from unsubscribed community",
    post.community.id,
    unsubscribedCommunity.id,
  );
  // Validate pagination metadata
  TestValidator.equals("pagination limit", feedResponse.pagination.limit, 10);
  TestValidator.equals("pagination page", feedResponse.pagination.current, 2);
  TestValidator.predicate(
    "at least one post in total",
    feedResponse.pagination.records >= 1,
  );
}