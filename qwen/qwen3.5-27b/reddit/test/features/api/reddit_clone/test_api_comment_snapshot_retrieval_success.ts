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
 * Test successful retrieval of a comment snapshot with complete denormalized data.
 *
 * Validates the complete comment snapshot lifecycle including member authentication, post creation, comment creation, snapshot generation, and snapshot retrieval. Ensures that the snapshot preserves all comment data at the point-in-time it was created, including denormalized user profile, post reference, and content.
 *
 * Special attention is given to verifying data integrity of the snapshot, ensuring all foreign key references are correctly denormalized and that timestamps accurately reflect the comment's state at snapshot creation time.
 *
 * 1. Member registers and authenticates with email, password, and username.
 * 2. Member creates a text post in a subscribed community.
 * 3. Member creates a top-level comment on the post.
 * 4. A snapshot is created for the comment capturing its current state.
 * 5. The snapshot is retrieved using post ID, comment ID, and snapshot ID.
 * 6. Validates snapshot contains correct denormalized data and timestamps.
 */
export async function test_api_comment_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create a post
  const post: IRedditClonePost =
    await generate_random_reddit_clone_member_posts_create(memberConnection, {
      body: {
        post_type: "text",
      },
    });
  typia.assert(post);
  // 3. Create a comment on the post
  const comment: IRedditCloneComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Create a snapshot of the comment
  const snapshot: IRedditCloneCommentSnapshot =
    await api.functional.redditClone.posts.comments.snapshots.create(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  typia.assert(snapshot);
  // 5. Retrieve the snapshot
  const retrievedSnapshot: IRedditCloneCommentSnapshot =
    await api.functional.redditClone.posts.comments.snapshots.at(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 6. Validate snapshot data integrity
  TestValidator.equals(
    "snapshot ID matches",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "comment ID reference",
    retrievedSnapshot.reddit_clone_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "user profile ID",
    retrievedSnapshot.userProfile.id,
    comment.author.id,
  );
  TestValidator.equals("post ID reference", retrievedSnapshot.post.id, post.id);
  TestValidator.equals(
    "content preserved",
    retrievedSnapshot.content,
    comment.content,
  );
  TestValidator.equals(
    "created_at preserved",
    retrievedSnapshot.created_at,
    comment.created_at,
  );
  TestValidator.equals(
    "updated_at preserved",
    retrievedSnapshot.updated_at,
    comment.updated_at,
  );
  TestValidator.predicate(
    "snapshot_created_at exists",
    retrievedSnapshot.snapshot_created_at !== null &&
      retrievedSnapshot.snapshot_created_at !== undefined,
  );
  TestValidator.equals(
    "parent comment is null for top-level",
    retrievedSnapshot.parentComment,
    null,
  );
}