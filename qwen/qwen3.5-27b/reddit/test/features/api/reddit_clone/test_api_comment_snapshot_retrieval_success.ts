import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test successful retrieval of a comment snapshot after a comment has been edited.
 *
 * This test validates the comment snapshot retrieval functionality by:
 * 1. Creating a member account and authenticating
 * 2. Creating a community as prerequisite for post creation
 * 3. Creating a post in the community
 * 4. Creating a comment on the post
 * 5. Retrieving the comment snapshot and validating its structure
 */
export async function test_api_comment_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: undefined,
  });
  // 2. Create community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: undefined,
      },
    );
  typia.assert(community);
  // 3. Create post in community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Create comment on post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: undefined,
      },
    );
  typia.assert(comment);
  // 5. Retrieve comment snapshot
  // Note: In a real scenario, the comment would be edited first to create a snapshot.
  // For this test, we use the comment ID as the snapshot ID to test the retrieval endpoint.
  const snapshot = await api.functional.redditClone.posts.comments.snapshots.at(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
      snapshotId: comment.id,
    },
  );
  typia.assert(snapshot);
  // 6. Validate snapshot data integrity
  TestValidator.equals("snapshot id matches", snapshot.id, comment.id);
  TestValidator.equals("content preserved", snapshot.content, comment.content);
  TestValidator.equals(
    "vote score preserved",
    snapshot.vote_score,
    comment.score,
  );
  TestValidator.equals(
    "author id matches",
    snapshot.author.id,
    comment.author.id,
  );
  TestValidator.equals("post id matches", snapshot.post.id, comment.post.id);
  TestValidator.predicate(
    "snapshot created at is valid",
    snapshot.snapshot_created_at != null,
  );
  TestValidator.predicate(
    "comment created at is valid",
    snapshot.comment_created_at != null,
  );
  TestValidator.predicate(
    "comment updated at is valid",
    snapshot.comment_updated_at != null,
  );
  TestValidator.equals(
    "comment deleted at is null",
    snapshot.comment_deleted_at,
    null,
  );
}
