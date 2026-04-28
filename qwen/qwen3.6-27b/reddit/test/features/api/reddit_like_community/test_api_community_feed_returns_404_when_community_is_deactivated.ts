import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Validates that accessing the feed of a soft-deleted community returns 404 Not Found.
 *
 * This test ensures that communities which have been soft-deleted (and consequently have
 * cascade-deleted posts) do not return any feed data to unauthenticated users. The endpoint
 * specification requires filtering `communities.deleted_at IS NULL`, which should exclude
 * deleted communities from query results.
 *
 * 1. Register a member who will create and later delete the community.
 * 2. Create a community as the member.
 * 3. Subscribe to the community as the member.
 * 4. Publish a post in the community as the member.
 * 5. Delete the community as the creator, cascade-deleting associated posts.
 * 6. Use a separate user connection to make a PATCH request to the community feed endpoint.
 * 7. Validate that the API returns HTTP 404 Not Found status code.
 */
export async function test_api_community_feed_returns_404_when_community_is_deactivated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the member who will create and delete the community
  const memberConnection: api.IConnection = { host: connection.host };
  const memberBody: IREdditLikeCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_member_join(memberConnection, { body: memberBody });
  // 2. Create a community
  const community: IREdditLikeCommunityCommunity =
    await api.functional.redditLikeCommunity.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await api.functional.redditLikeCommunity.member.community_subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Publish a post in the community
  const post: IREdditLikeCommunityPost =
    await api.functional.redditLikeCommunity.member.posts.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "text",
          community_id: community.id,
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IREdditLikeCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  // 5. Delete the community
  await api.functional.redditLikeCommunity.member.communities.erase(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 6. New user connection to attempt accessing the feed of the deleted community
  const userConnection: api.IConnection = { host: connection.host };
  // 7. Validate that accessing the feed of the deleted community returns 404
  await TestValidator.httpError(
    "deleted community returns 404",
    404,
    async () => {
      await api.functional.redditLikeCommunity.communities.feeds.index(
        userConnection,
        {
          communityId: community.id,
          body: typia.random<IREdditLikeCommunityPost.IRequest>(),
        },
      );
    },
  );
}
