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

export async function test_api_member_home_feed_with_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: member.token.access,
  };
  // 2. Create test communities by subscribing to them (creates if doesn't exist)
  const community1Name = `community_${RandomGenerator.alphabets(6)}`;
  const community2Name = `community_${RandomGenerator.alphabets(6)}`;
  const community3Name = `community_${RandomGenerator.alphabets(6)}`;
  const community1 =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      { communityName: community1Name },
    );
  typia.assert(community1);
  const community2 =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      { communityName: community2Name },
    );
  typia.assert(community2);
  const community3 =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      { communityName: community3Name },
    );
  typia.assert(community3);
  // 3. Create posts in subscribed communities
  const post1 = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: `Post in ${community1Name}`,
        type: "text" as const,
        content: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: community1.community.id,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: `Post in ${community2Name}`,
        type: "text" as const,
        content: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: community2.community.id,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post2);
  // 4. Create post in community3 (which is already subscribed)
  const post3 = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: `Post in ${community3Name}`,
        type: "text" as const,
        content: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: community3.community.id,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post3);
  // 5. Get home feed and verify it contains posts from all subscribed communities
  const feed =
    await api.functional.redditLike.member.feed.home.search(memberConnection);
  typia.assert(feed);
  // 6. Validate feed contents - all subscribed community posts should be present
  const post1InFeed = feed.data.some((p) => p.id === post1.id);
  const post2InFeed = feed.data.some((p) => p.id === post2.id);
  const post3InFeed = feed.data.some((p) => p.id === post3.id);
  TestValidator.predicate(
    "post1 from subscribed community1 appears in feed",
    post1InFeed,
  );
  TestValidator.predicate(
    "post2 from subscribed community2 appears in feed",
    post2InFeed,
  );
  TestValidator.predicate(
    "post3 from subscribed community3 appears in feed",
    post3InFeed,
  );
  // 7. Unsubscribe from community3 and verify feed updates
  await api.functional.redditLike.member.communities.subscribe.unsubscribe(
    memberConnection,
    { communityName: community3Name },
  );
  const updatedFeed =
    await api.functional.redditLike.member.feed.home.search(memberConnection);
  typia.assert(updatedFeed);
  const post3InUpdatedFeed = updatedFeed.data.some((p) => p.id === post3.id);
  TestValidator.predicate(
    "post3 does not appear in feed after unsubscribing from community3",
    !post3InUpdatedFeed,
  );
  // 8. Verify all feed posts are from subscribed communities
  const allCommunityIds = updatedFeed.data.map((p) => p.community.id);
  const hasOnlySubscribedCommunities = allCommunityIds.every(
    (id) => id === community1.community.id || id === community2.community.id,
  );
  TestValidator.predicate(
    "all feed posts are from subscribed communities only",
    hasOnlySubscribedCommunities,
  );
}
