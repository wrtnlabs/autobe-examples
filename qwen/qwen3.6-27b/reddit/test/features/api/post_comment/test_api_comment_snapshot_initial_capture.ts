import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIREdditLikeCommunityPostCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIREdditLikeCommunityPostCommentSnapshot";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityPostCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPostCommentSnapshot";
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
 * Test that creating a comment automatically generates an initial snapshot capturing the original content.
 *
 * Validates the complete comment lifecycle flow including member authentication, community setup, post creation, and comment creation. Ensures that an initial comment snapshot is automatically created with the exact body text of the original comment, preserving the immutable record required by the comment snapshot specification.
 *
 * Special attention is given to verifying that top-level comments produce snapshots with null parentComment references, confirming the threading hierarchy is correctly captured in the snapshot. The test confirms that exactly one snapshot exists immediately after comment creation without any edits.
 *
 * 1. Member registers and authenticates on the platform.
 * 2. Member creates a community for content posting.
 * 3. Member subscribes to the community to enable post creation.
 * 4. Member creates a post in the subscribed community.
 * 5. Member creates a top-level comment on the post with known body text.
 * 6. Retrieves snapshots for the created comment using the snapshots endpoint.
 * 7. Validates exactly one snapshot exists with matching body text and null parentComment.
 */
export async function test_api_comment_snapshot_initial_capture(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(1),
    },
  });
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Create post in community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Create top-level comment with specific body for validation
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
  // 6. Retrieve snapshots for the created comment
  const snapshots =
    await api.functional.redditLikeCommunity.member.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {} satisfies IREdditLikeCommunityPostCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 7. Validate snapshot results
  TestValidator.equals("exactly one snapshot exists", snapshots.data.length, 1);
  const snapshot = snapshots.data[0];
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot body matches original comment text",
    snapshot.body,
    commentBody,
  );
  TestValidator.equals(
    "top-level comment has null parentComment in snapshot",
    snapshot.parentComment,
    null,
  );
}
