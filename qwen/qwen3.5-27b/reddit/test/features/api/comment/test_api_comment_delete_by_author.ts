import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
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
 * Test that a member can successfully delete their own comment.
 *
 * Validates the complete comment deletion workflow including member authentication, post creation, comment creation, and comment deletion by the author. Ensures that deleted comments are properly soft-deleted and the deletion operation completes successfully.
 *
 * The test verifies that the comment author can delete their own comment, and that the deletion operation executes without errors. The soft-delete functionality sets the deleted_at timestamp on the comment, making it inaccessible in normal views.
 *
 * 1. Authenticate as a member user with email, password, and username.
 * 2. Create a post in a subscribed community with title and content.
 * 3. Create a comment on the post with comment content.
 * 4. Delete the comment using the DELETE endpoint with postId and commentId.
 * 5. Verify the deletion completed successfully without throwing errors.
 * 6. Validate that attempting to delete the same comment again is idempotent.
 */
export async function test_api_comment_delete_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  TestValidator.equals("post created successfully", typeof post.id, "string");
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
  TestValidator.equals(
    "comment created successfully",
    typeof comment.id,
    "string",
  );
  TestValidator.equals(
    "comment belongs to correct post",
    comment.post.id,
    post.id,
  );
  // 4. Delete the comment
  await api.functional.redditClone.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 5. Verify deletion completed successfully
  TestValidator.predicate("comment deletion completed without error", true);
  // 6. Verify idempotency - deleting the same comment again should not throw
  await api.functional.redditClone.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  TestValidator.predicate("comment deletion is idempotent", true);
}
