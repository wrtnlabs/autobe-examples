import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";

export async function test_api_member_comment_update_edit_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member1 = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "12341234",
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member1);
  // 2. Create a post first (using a placeholder since post creation function is not available in provided SDK)
  const postId = "00000000-0000-0000-0000-000000000001";
  // 3. Create comment on the post
  const comment = await api.functional.redditLike.member.posts.comments.create(
    memberConnection,
    {
      postId: postId,
      body: {
        content: "Original comment content for edit window test",
        parent_comment_id: null,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);
  // Record creation time
  const createdAt = new Date(comment.created_at).getTime();
  // 4. Immediate update (within 5-minute window) - should succeed
  const updatedComment1 =
    await api.functional.redditLike.member.comments.update(memberConnection, {
      commentId: comment.id,
      body: {
        content: "Updated comment content (first edit)",
      } satisfies IRedditLikeComment.IUpdate,
    });
  typia.assert(updatedComment1);
  TestValidator.equals(
    "first update succeeded",
    updatedComment1.content,
    "Updated comment content (first edit)",
  );
  // Verify updated_at changed
  const updatedAt1 = new Date(updatedComment1.updated_at).getTime();
  TestValidator.notEquals(
    "updated_at changed after first edit",
    createdAt,
    updatedAt1,
  );
  // 5. Wait approximately 5 minutes (300 seconds)
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
  const timeSinceCreation = Date.now() - createdAt;
  const remainingTime = Math.max(0, fiveMinutes - timeSinceCreation);
  // Wait for the remaining time to ensure we're past the 5-minute window
  if (remainingTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingTime + 1000));
  }
  // 6. Attempt to update after 5-minute window - should fail with 403 Forbidden
  await TestValidator.error("update fails after 5-minute window", async () => {
    await api.functional.redditLike.member.comments.update(memberConnection, {
      commentId: comment.id,
      body: {
        content: "Updated comment content (second edit - should fail)",
      } satisfies IRedditLikeComment.IUpdate,
    });
  });
}
