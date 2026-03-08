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

export async function test_api_comment_deletion_nested_reply(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post ID (from scenario context)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create parent comment (comment A)
  const parentComment =
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: postId,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // 4. Create nested reply (comment B) to parent comment
  const nestedReply =
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: postId,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: parentComment.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(nestedReply);
  // 5. Delete the parent comment
  await api.functional.redditLike.member.comments.erase(memberConnection, {
    commentId: parentComment.id,
  });
  // 6. Verify: nested reply still exists with correct parent reference
  TestValidator.equals(
    "nested reply post_id matches original post",
    nestedReply.post_id,
    postId,
  );
  TestValidator.equals(
    "nested reply parent_comment_id matches deleted parent comment",
    nestedReply.parent_comment_id,
    parentComment.id,
  );
}
