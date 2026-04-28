import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentSnapshot";
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
 * Test retrieving the automatically generated initial snapshot for a newly created comment.
 *
 * Validates that when a member creates a comment on a post, an initial snapshot is automatically generated preserving the comment's original state. The test follows the complete workflow: member authentication, community creation, subscription, post creation, comment creation, and snapshot retrieval.
 *
 * Special attention is given to verifying that the snapshot correctly captures the comment's body text matching the original content, maintains proper foreign key references to the post and comment, includes the author attribution with member identity, and records the creation timestamp. For top-level comments, the snapshot's parentCommentId should be null.
 *
 * 1. Authenticate member via join to gain posting capabilities
 * 2. Create a community under the member's ownership
 * 3. Subscribe member to the community to gain posting privileges
 * 4. Create a text post in the community
 * 5. Create a top-level comment on the post with specific body text
 * 6. Retrieve the initial snapshot of that comment using postId and commentId
 * 7. Validate snapshot body matches original comment content, IDs are consistent, and author/post context is preserved
 */
export async function test_api_comment_snapshot_retrieve_initial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberInfo = await authorize_member_join(memberConnection, {
    body: {
      password: "Password123!",
    },
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. Create a text post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: { post_type: "text", community_id: community.id },
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment with known body text
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
  // 6. Retrieve the initial snapshot of the comment
  // snapshotId is derived from the comment's ID since it is the auto-generated reference
  const snapshot =
    await api.functional.redditLikeCommunity.member.posts.comments.snapshots.at(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        snapshotId: comment.id,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot preserves original comment state
  TestValidator.equals(
    "snapshot commentId matches created comment",
    snapshot.commentId,
    comment.id,
  );
  TestValidator.equals(
    "snapshot postId matches created post",
    snapshot.postId,
    post.id,
  );
  TestValidator.equals(
    "snapshot body matches original comment body",
    snapshot.body,
    commentBody,
  );
  TestValidator.equals(
    "snapshot memberId matches authenticated member",
    snapshot.memberId,
    memberInfo.id,
  );
  TestValidator.predicate(
    "top-level comment has null parentCommentId",
    snapshot.parentCommentId === null,
  );
  TestValidator.predicate(
    "snapshot includes comment summary with matching id",
    snapshot.comment.id === comment.id,
  );
  TestValidator.predicate(
    "snapshot includes post summary with matching id",
    snapshot.post.id === post.id,
  );
  TestValidator.predicate(
    "snapshot includes author summary with matching id",
    snapshot.author.id === memberInfo.id,
  );
}
