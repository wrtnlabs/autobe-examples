import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test the primary success path for creating a comment snapshot.
 *
 * Validates the complete comment snapshot creation workflow including member authentication, post creation, comment creation, and snapshot generation. Ensures that the snapshot correctly captures the comment state at the time of snapshot creation with all expected fields including author profile, post reference, and timestamps.
 *
 * Special attention is given to verifying that the snapshot_created_at timestamp differs from the comment's created_at timestamp, proving that the snapshot is a distinct point-in-time capture. The test also validates that the snapshot data matches the current state of the comment.
 *
 * 1. Authenticate as a member user with email, password, and username.
 * 2. Create a post in a community with title and content.
 * 3. Create a comment on that post with content text.
 * 4. Call the snapshot endpoint with postId and commentId.
 * 5. Validate the snapshot response structure and all fields.
 * 6. Verify snapshot_created_at differs from comment created_at.
 * 7. Verify snapshot data matches comment state.
 */
export async function test_api_comment_snapshot_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {},
      },
    );
  typia.assert(comment);
  // 4. Create a snapshot of the comment
  const snapshot =
    await api.functional.redditClone.posts.comments.snapshots.create(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  typia.assert(snapshot);
  // 5. Verify snapshot contains all expected fields
  TestValidator.equals("snapshot has valid id", typeof snapshot.id, "string");
  TestValidator.equals(
    "reddit_clone_comment_id matches comment id",
    snapshot.reddit_clone_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "userProfile display_name matches comment author",
    snapshot.userProfile.display_name,
    comment.author.display_name,
  );
  TestValidator.equals(
    "post id matches original post",
    snapshot.post.id,
    post.id,
  );
  TestValidator.equals(
    "post title matches original post",
    snapshot.post.title,
    post.title,
  );
  TestValidator.equals(
    "parentComment is null for top-level comment",
    snapshot.parentComment,
    null,
  );
  TestValidator.equals(
    "content matches comment content",
    snapshot.content,
    comment.content,
  );
  TestValidator.equals(
    "created_at matches comment created_at",
    snapshot.created_at,
    comment.created_at,
  );
  TestValidator.equals(
    "updated_at matches comment updated_at",
    snapshot.updated_at,
    comment.updated_at,
  );
  // 6. Verify snapshot_created_at differs from comment created_at
  TestValidator.notEquals(
    "snapshot_created_at differs from comment created_at",
    snapshot.snapshot_created_at,
    comment.created_at,
  );
  // 7. Verify snapshot data matches comment state
  TestValidator.equals(
    "snapshot author karma matches comment author karma",
    snapshot.userProfile.karma,
    comment.author.karma,
  );
  TestValidator.equals(
    "snapshot community matches post community",
    snapshot.post.community.id,
    post.community.id,
  );
}
