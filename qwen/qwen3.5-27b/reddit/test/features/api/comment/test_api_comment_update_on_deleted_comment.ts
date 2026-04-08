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
 * Test that a member cannot update a comment that has been soft-deleted.
 *
 * Validates the business rule that soft-deleted comments cannot be edited. The test authenticates a member, creates a post, creates a comment on the post, deletes the comment (soft delete), and then attempts to update the deleted comment. The system should reject the update with a 404 Not Found error, confirming that soft-deleted comments are immutable.
 *
 * Special attention is given to verifying that the update operation fails with the correct HTTP status code (404 Not Found) when attempting to modify a comment that has been soft-deleted.
 *
 * 1. Member authenticates successfully using authorize_member_join utility function.
 * 2. Member creates a post in a subscribed community using generate_random_reddit_clone_member_posts_create utility function.
 * 3. Member creates a comment on the post using generate_random_reddit_clone_member_posts_comments_create utility function.
 * 4. Member deletes the comment (soft delete) using api.functional.redditClone.member.posts.comments.erase SDK function.
 * 5. Member attempts to update the deleted comment with new content using api.functional.redditClone.member.posts.comments.update SDK function.
 * 6. System rejects the update with a 404 Not Found error.
 */
export async function test_api_comment_update_on_deleted_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
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
  // 4. Delete the comment (soft delete)
  await api.functional.redditClone.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 5. Attempt to update the deleted comment - should return 404 Not Found
  await TestValidator.httpError(
    "update deleted comment returns 404",
    404,
    async () => {
      await api.functional.redditClone.member.posts.comments.update(
        memberConnection,
        {
          postId: post.id,
          commentId: comment.id,
          body: {
            content: "Attempted update on deleted comment",
          } satisfies IRedditCloneComment.IUpdate,
        },
      );
    },
  );
}
