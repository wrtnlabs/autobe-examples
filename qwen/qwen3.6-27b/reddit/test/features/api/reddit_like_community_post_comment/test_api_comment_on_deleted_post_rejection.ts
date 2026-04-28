import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
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
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Comments cannot be created on a post that has been deleted.
 *
 * Validates the business rule that post comments can only be created on
 * non-deleted posts. When a post author deletes their post, any subsequent
 * comment creation attempt by any member must fail with a 400 error.
 *
 * 1. Member A authenticates and becomes the active user.
 * 2. Member A creates a new community.
 * 3. Member A subscribes to the created community.
 * 4. Member A creates a new post in the community.
 * 5. Member A deletes the post using the delete endpoint.
 * 6. Member B authenticates as a separate user.
 * 7. Member B subscribes to the same community.
 * 8. Member B attempts to create a comment on the deleted post.
 *
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Verify the post exists and is not soft-deleted (deleted_at IS NULL) before allowing comment creation. Return 400 error when the post has been deleted.
 */
export async function test_api_comment_on_deleted_post_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: "deletedpost_test_memberA@example.com",
      password: "Password123!",
      username: "deleted_post_member_a",
    },
  });
  // 2. Member A creates community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberAConnection,
    { body: { community_id: community.id } },
  );
  // 4. Member A creates post in community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberAConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Member A deletes the post
  await api.functional.redditLikeCommunity.member.posts.erase(
    memberAConnection,
    {
      postId: post.id,
    },
  );
  // 6. Member B authenticates
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: "deletedpost_test_memberB@example.com",
      password: "Password123!",
      username: "deleted_post_member_b",
    },
  });
  // 7. Member B subscribes to same community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberBConnection,
    { body: { community_id: community.id } },
  );
  // 8. Member B attempts to comment on deleted post - should fail
  await TestValidator.error(
    "Cannot create comment on deleted post",
    async () => {
      await api.functional.redditLikeCommunity.member.posts.comments.create(
        memberBConnection,
        {
          postId: post.id,
          body: {
            body: "This comment should fail",
          } satisfies IRedditLikeCommunityPostComment.ICreate,
        },
      );
    },
  );
}