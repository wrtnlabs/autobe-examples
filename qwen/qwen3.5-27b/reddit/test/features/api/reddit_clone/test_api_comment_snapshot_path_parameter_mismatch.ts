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
 * Test the path parameter consistency validation for comment snapshot retrieval.
 *
 * Validates that the comment snapshot retrieval endpoint enforces hierarchical navigation integrity by ensuring path parameters match the snapshot's foreign key references. Tests the complete setup flow including member authentication, post creation, comment creation, and snapshot creation, then attempts to retrieve the snapshot with mismatched path parameters.
 *
 * Special attention is given to verifying that providing a postId that doesn't match the snapshot's actual reddit_clone_post_id results in a 400 Bad Request error, preventing access to snapshots through incorrect parent references.
 *
 * 1. Authenticate a new member with email, password, and username.
 * 2. Create a post in a subscribed community.
 * 3. Create a comment on the post.
 * 4. Create a snapshot of the comment.
 * 5. Attempt to retrieve the snapshot with a mismatched postId.
 * 6. Verify that the API returns a 400 Bad Request error due to path parameter mismatch.
 */
export async function test_api_comment_snapshot_path_parameter_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    { body: {} },
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
  // 5. Generate a different postId to create mismatch
  const mismatchedPostId = typia.random<string & tags.Format<"uuid">>();
  // 6. Attempt to retrieve with mismatched postId - should fail
  await TestValidator.httpError(
    "should return 400 for mismatched postId",
    400,
    async () =>
      await api.functional.redditClone.posts.comments.snapshots.at(
        memberConnection,
        {
          postId: mismatchedPostId,
          commentId: comment.id,
          snapshotId: snapshot.id,
        },
      ),
  );
}
