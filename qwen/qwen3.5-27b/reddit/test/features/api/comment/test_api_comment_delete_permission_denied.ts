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
 * Test that a member cannot delete another user's comment (permission denied scenario).
 *
 * Validates the authorization rule that only comment authors or community moderators can delete comments. The test creates two separate member accounts, has member A create a comment on a post, then attempts to delete that comment as member B. The system should reject the deletion with a 403 Forbidden error, and the comment should remain intact.
 *
 * Special attention is given to verifying that the permission denied error is properly returned and that the comment persists after the failed deletion attempt.
 *
 * 1. Authenticate as member A who will create the comment.
 * 2. Create a post in a community (assumes community exists from test setup).
 * 3. Create a comment on the post as member A.
 * 4. Authenticate as member B (different user).
 * 5. Attempt to delete member A's comment as member B.
 * 6. Verify the system returns a 403 Forbidden error.
 * 7. Verify the comment still exists by creating a reply to it (proving it wasn't deleted).
 */
export async function test_api_comment_delete_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create a post (using generation utility which handles community subscription)
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post as member A
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberAConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 4. Authenticate as member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "password456",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberB);
  // 5. Attempt to delete member A's comment as member B (should fail with 403)
  await TestValidator.httpError(
    "deleting another user's comment should return 403 Forbidden",
    403,
    async () =>
      await api.functional.redditClone.member.posts.comments.erase(
        memberBConnection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      ),
  );
  // 6. Verify the comment still exists by creating a reply to it as member B
  // If the comment was deleted, this would fail with 404
  const reply = await generate_random_reddit_clone_member_posts_comments_create(
    memberBConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
        parentCommentId: comment.id,
      },
    },
  );
  typia.assert(reply);
  // 7. Verify the reply was created as a child of the original comment
  TestValidator.equals(
    "reply should reference the original comment as parent",
    reply.parentComment?.id,
    comment.id,
  );
}
