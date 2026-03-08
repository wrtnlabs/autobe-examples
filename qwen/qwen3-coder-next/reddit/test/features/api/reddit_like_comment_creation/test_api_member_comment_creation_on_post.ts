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

export async function test_api_member_comment_creation_on_post(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // Create a post using the member
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        content: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
        community_id: "c1c5d5c5-d5c5-d5c5-d5c5-d5c5d5c5d5c5",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Test: Create comment on post
  const content = RandomGenerator.content({ paragraphs: 2 });
  const comment = await api.functional.redditLike.member.posts.comments.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        content,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);
  // Validate comment properties
  TestValidator.equals("comment content matches", comment.content, content);
  TestValidator.equals("author id matches", comment.author_id, member.id);
  TestValidator.equals("post id matches", comment.post_id, post.id);
  TestValidator.equals(
    "parent_comment_id is null",
    comment.parent_comment_id,
    null,
  );
  TestValidator.equals("vote_score is 0", comment.vote_score, 0);
  // Test: Create reply comment
  const replyContent = RandomGenerator.content({ paragraphs: 1 });
  const reply = await api.functional.redditLike.member.posts.comments.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        content: replyContent,
        parent_comment_id: comment.id,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(reply);
  TestValidator.equals(
    "reply parent_comment_id matches",
    reply.parent_comment_id,
    comment.id,
  );
  TestValidator.equals("reply content matches", reply.content, replyContent);
}
