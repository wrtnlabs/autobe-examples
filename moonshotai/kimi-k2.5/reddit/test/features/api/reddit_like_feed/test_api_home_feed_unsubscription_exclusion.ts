import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
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
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_home_feed_unsubscription_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@${RandomGenerator.alphabets(6)}.com`,
      username: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Create a post in the subscribed community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Verify the post appears in the home feed
  const feedBeforeUnsubscribe =
    await api.functional.redditLike.member.feeds.home.index(memberConnection, {
      body: {
        sort: "new",
        page: 1,
        limit: 20,
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(feedBeforeUnsubscribe);
  TestValidator.predicate(
    "home feed contains post from subscribed community",
    () => feedBeforeUnsubscribe.pagination.records === 1,
  );
  TestValidator.predicate(
    "home feed data has one post",
    () => feedBeforeUnsubscribe.data.length === 1,
  );
  TestValidator.equals(
    "post id matches",
    feedBeforeUnsubscribe.data[0].id,
    post.id,
  );
  // 6. Unsubscribe from the community
  await api.functional.redditLike.member.communities.subscriptions.erase(
    memberConnection,
    { communityId: community.id },
  );
  // 7. Verify the post no longer appears in the home feed
  const feedAfterUnsubscribe =
    await api.functional.redditLike.member.feeds.home.index(memberConnection, {
      body: {
        sort: "new",
        page: 1,
        limit: 20,
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(feedAfterUnsubscribe);
  TestValidator.predicate(
    "home feed is empty after unsubscription",
    () => feedAfterUnsubscribe.pagination.records === 0,
  );
  TestValidator.predicate(
    "home feed data is empty",
    () => feedAfterUnsubscribe.data.length === 0,
  );
  TestValidator.notEquals(
    "pagination records changed",
    feedBeforeUnsubscribe.pagination.records,
    feedAfterUnsubscribe.pagination.records,
  );
}
