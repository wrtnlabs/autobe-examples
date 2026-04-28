import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Validates that the image endpoint returns 404 Not Found when retrieving image metadata for a soft-deleted post.
 *
 * Tests the business rule that soft-deleted posts are completely hidden from the public image retrieval endpoint. Even though image attachment records may exist in the database, the endpoint first checks that the associated post is not soft-deleted before returning any metadata.
 *
 * 1. A member registers and authenticates on the platform.
 * 2. The member creates a community and subscribes to it.
 * 3. The member creates an image-type post with image attachment.
 * 4. The member soft-deletes the post as the author.
 * 5. The public image retrieval endpoint is called with the deleted post's UUID.
 * 6. The system returns 404 Not Found because the post has been soft-deleted.
 */
export async function test_api_post_image_retrieval_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create an image-type post
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        post_type: "image",
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 5. Soft-delete the post by the author
  await api.functional.redditLikeCommunity.member.posts.erase(
    memberConnection,
    {
      postId: post.id,
    },
  );
  // 6. Attempt to retrieve image metadata for the deleted post - expect 404
  const publicConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "image retrieval returns 404 for deleted post",
    404,
    async () =>
      api.functional.redditLikeCommunity.posts.image.at(publicConnection, {
        postId: post.id,
      }),
  );
}
