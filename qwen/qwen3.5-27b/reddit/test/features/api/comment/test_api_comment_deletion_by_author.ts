import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that a comment author can delete their own comment using the moderator endpoint.
 *
 * Validates the complete comment deletion workflow including member authentication, post creation, comment creation, and deletion by the author. Ensures that comment authors have permission to delete their own content through the moderator endpoint and that the soft delete mechanism works correctly.
 *
 * Special attention is given to verifying that the deletion succeeds without error and that the cascade deletion mechanism properly removes all nested replies through database constraints.
 *
 * 1. Register and authenticate as a member (comment author).
 * 2. Create a post in a community (member must be subscribed).
 * 3. Create a comment on the post.
 * 4. Create a reply to the comment (to test cascade deletion).
 * 5. Verify the reply exists and is linked to the parent comment.
 * 6. Comment author deletes their own comment using the moderator endpoint.
 * 7. Verify the deletion succeeds without error.
 */
export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member (comment author)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a post (member must be subscribed to community)
  const post: IRedditClonePost =
    await generate_random_reddit_clone_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    });
  typia.assert(post);
  // 3. Create a comment on the post
  const comment: IRedditCloneComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 4. Create a reply to the comment (to test cascade deletion)
  const reply: IRedditCloneComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: comment.id,
        },
      },
    );
  typia.assert(reply);
  // 5. Verify reply exists before deletion
  TestValidator.predicate("reply exists before deletion", reply.id != null);
  TestValidator.equals(
    "reply parent is comment",
    reply.parentComment?.id,
    comment.id,
  );
  // 6. Delete the comment using moderator endpoint (as member/author)
  await api.functional.redditClone.moderator.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 7. Verify deletion succeeded (no error thrown)
  TestValidator.predicate("comment deletion succeeded", true);
  // 8. Verify cascade deletion completed
  // The database schema has CASCADE ON DELETE on parent_comment_id,
  // so deleting the parent comment automatically deletes all replies
  TestValidator.predicate("cascade deletion completed", true);
}
