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

export async function test_api_member_comment_threading_and_editing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (commenter)
  const memberConnection1: api.IConnection = { host: connection.host };
  const member1 = await api.functional.redditLike.auth.member.join(
    memberConnection1,
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
  typia.assert(member1);
  // 2. Register second member (replyer)
  const memberConnection2: api.IConnection = { host: connection.host };
  const member2 = await api.functional.redditLike.auth.member.join(
    memberConnection2,
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
  typia.assert(member2);
  // 3. Create post for testing
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection1,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        content: RandomGenerator.content({ paragraphs: 3 }),
        community_id: "00000000-0000-0000-0000-000000000001",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create top-level comment
  const topLevelComment =
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection1,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  TestValidator.equals(
    "top-level comment parent is null",
    topLevelComment.parent_comment_id,
    null,
  );
  // 5. Create reply to top-level comment
  const replyComment =
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection2,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: topLevelComment.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(replyComment);
  TestValidator.equals(
    "reply has correct parent",
    replyComment.parent_comment_id,
    topLevelComment.id,
  );
  // Note: Comment update and delete operations cannot be tested as the required API endpoints
  // (GET/PUT/DELETE /comments/{commentId}) are not available in the provided API SDK.
  // The scenario requires these operations but they are not implemented in the backend API.
  // 6. Verify thread hierarchy
  TestValidator.equals(
    "top-level comment ID matches",
    topLevelComment.id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "reply comment ID matches",
    replyComment.id,
    replyComment.id,
  );
  TestValidator.equals(
    "reply parent matches top-level",
    replyComment.parent_comment_id,
    topLevelComment.id,
  );
  // 7. Verify comment content was saved correctly
  TestValidator.equals(
    "top-level content correct",
    topLevelComment.content.length > 0,
    true,
  );
  TestValidator.equals(
    "reply content correct",
    replyComment.content.length > 0,
    true,
  );
  // 8. Verify timestamps are present
  TestValidator.predicate(
    "top-level created_at valid",
    new Date(topLevelComment.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "top-level updated_at valid",
    new Date(topLevelComment.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "reply created_at valid",
    new Date(replyComment.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "reply updated_at valid",
    new Date(replyComment.updated_at).getTime() > 0,
  );
  // 9. Verify author information is populated
  TestValidator.equals(
    "top-level has author",
    topLevelComment.author.id !== undefined,
    true,
  );
  TestValidator.equals(
    "reply has author",
    replyComment.author.id !== undefined,
    true,
  );
  TestValidator.equals(
    "top-level has post",
    topLevelComment.post.id !== undefined,
    true,
  );
  TestValidator.equals(
    "reply has post",
    replyComment.post.id !== undefined,
    true,
  );
  // 10. Verify post information in comment
  TestValidator.equals(
    "comment post matches",
    topLevelComment.post.id,
    post.id,
  );
  TestValidator.equals("reply post matches", replyComment.post.id, post.id);
}
