import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommentSnapshot";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentSnapshot";
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
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test successful retrieval of an existing comment snapshot.
 * Setup: 1) Authenticate as member via POST /redditLike/auth/member/join, 2) Create a community via POST /redditLike/member/communities, 3) Subscribe to the community via POST /redditLike/member/communities/{communityId}/subscriptions, 4) Create a post in the community via POST /redditLike/member/posts, 5) Create a comment on the post via POST /redditLike/member/posts/{postId}/comments, 6) Update the comment via PUT /redditLike/member/posts/{postId}/comments/{commentId} to trigger snapshot creation, 7) List snapshots via PATCH /redditLike/comments/{commentId}/snapshots to obtain the snapshotId, 8) Call GET endpoint with the commentId and snapshotId. Verify: Response returns IRedditLikeCommentSnapshot with id, commentId, body (historical content), editReason, and createdAt. The body contains the previous version of the comment before the update.
 */
export async function test_api_comment_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    { communityId: community.id },
  );
  // 4. Create a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: prepare_random_reddit_like_post({
        community_id: community.id,
      } satisfies Partial<IRedditLikePost.ICreate>),
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const originalComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      { params: { postId: post.id } },
    );
  typia.assert(originalComment);
  // 6. Update the comment to trigger snapshot creation
  const updatedContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedComment =
    await api.functional.redditLike.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: originalComment.id,
        body: { content: updatedContent } satisfies IRedditLikeComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 7. List snapshots to obtain the snapshotId
  const snapshotList = await api.functional.redditLike.comments.snapshots.index(
    memberConnection,
    {
      commentId: originalComment.id,
      body: {} satisfies IRedditLikeCommentSnapshot.IRequest,
    },
  );
  typia.assert(snapshotList);
  TestValidator.predicate(
    "snapshots should exist after update",
    snapshotList.data.length > 0,
  );
  TestValidator.predicate(
    "comment should be marked as edited",
    updatedComment.isEdited === true,
  );
  const snapshotId = snapshotList.data[0]!.id;
  // 8. Call GET endpoint to retrieve specific snapshot
  const snapshot = await api.functional.redditLike.comments.snapshots.at(
    memberConnection,
    {
      commentId: originalComment.id,
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // Verify the snapshot contains correct data
  TestValidator.equals(
    "snapshot commentId matches",
    snapshot.commentId,
    originalComment.id,
  );
  TestValidator.equals("snapshot id matches", snapshot.id, snapshotId);
  // The body should contain the previous version of the comment before the update
  TestValidator.equals(
    "snapshot body contains original content",
    snapshot.body,
    originalComment.content,
  );
}