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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_comment_thread_with_no_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor connection and register a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create a post in a community for the comment
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a top-level comment with no parent
  const comment = await api.functional.redditLike.member.posts.comments.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
        parent_comment_id: null,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Retrieve the comment thread and validate
  const thread = await api.functional.redditLike.member.comments.at(
    memberConnection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(thread);
  // 5. Validate thread properties
  TestValidator.equals("comment ID matches", thread.id, comment.id);
  TestValidator.equals("content matches", thread.content, comment.content);
  TestValidator.equals("author matches", thread.author.id, member.member.id);
  TestValidator.equals("post matches", thread.post.id, post.id);
  TestValidator.equals("parentComment is null", thread.parentComment, null);
  TestValidator.equals("replies array is empty", thread.replies.length, 0);
  TestValidator.predicate("has valid vote_score", thread.vote_score === 0);
  TestValidator.predicate(
    "has valid timestamps",
    () => thread.created_at !== null && thread.updated_at !== null,
  );
}
