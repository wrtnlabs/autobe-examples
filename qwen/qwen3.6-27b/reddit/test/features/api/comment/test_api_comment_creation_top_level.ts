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
 * Test successful creation of a top-level comment on an existing post.
 *
 * Validates the complete comment creation workflow including member authentication, community creation, subscription, post creation, and top-level comment placement. Ensures that the comment is correctly associated with the post and author, vote score initializes at zero, and no child comments exist.
 *
 * Special attention is given to verifying that top-level comments have no parent comment reference, the author identity matches the authenticated member, and the post reference is correctly maintained.
 *
 * 1. Member registers and authenticates to the platform.
 * 2. Member creates a community for discussion context.
 * 3. Member subscribes to the community to gain commenting privileges.
 * 4. Member creates a post within the community as the comment target.
 * 5. Member creates a top-level comment on the post with text body content.
 * 6. Validates comment entity: body matches input, author matches member, post matches target, vote score is zero, child comments are empty, and deleted_at is null.
 */
export async function test_api_comment_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create post in community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  typia.assert(post);
  // 5. Create top-level comment on post (no parentCommentId)
  const commentBody = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { body: commentBody },
      },
    );
  typia.assert(comment);
  // 6. Validate top-level comment entity
  TestValidator.equals("comment body matches input", comment.body, commentBody);
  TestValidator.equals(
    "author is the authenticated member",
    comment.author.id,
    member.id,
  );
  TestValidator.equals("post id matches target post", comment.post.id, post.id);
  TestValidator.equals("vote score initializes at zero", comment.voteScore, 0);
  TestValidator.predicate(
    "child comments array is empty",
    comment.childComments.length === 0,
  );
  TestValidator.equals(
    "deleted_at is null for active comment",
    comment.deletedAt,
    null,
  );
  TestValidator.predicate(
    "created_at is set",
    comment.createdAt !== undefined && comment.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated_at is set",
    comment.updatedAt !== undefined && comment.updatedAt.length > 0,
  );
}
