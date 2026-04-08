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
 * Test that snapshot creation is rejected when attempting to snapshot a deleted comment.
 *
 * Validates the business rule that deleted comments cannot be snapshotted, ensuring the audit trail only captures active content states. The test creates a comment, deletes it, then attempts to create a snapshot for the deleted comment. The operation should return HTTP 403 Forbidden status, protecting against snapshotting content that has been removed from the system.
 *
 * This test covers the edge case where a user or system attempts to snapshot a comment after it has been soft-deleted (deleted_at timestamp is set). The 403 response indicates that the operation is forbidden due to the comment's deleted state, not due to authentication or authorization issues.
 *
 * 1. Authenticate as a member user with email, password, and username
 * 2. Create a post in a community with title and content
 * 3. Create a comment on the post with content text
 * 4. Delete the comment (soft delete - sets deleted_at timestamp)
 * 5. Attempt to create a snapshot for the deleted comment using postId and commentId
 * 6. Verify the operation returns HTTP 403 Forbidden status
 */
export async function test_api_comment_snapshot_deleted_comment_rejected(
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
      },
    );
  typia.assert(comment);
  // 4. Delete the comment
  await api.functional.redditClone.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 5. Attempt to create snapshot for deleted comment - should fail with 403
  await TestValidator.httpError(
    "snapshot creation rejected for deleted comment",
    403,
    async () =>
      await api.functional.redditClone.posts.comments.snapshots.create(
        memberConnection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      ),
  );
}
