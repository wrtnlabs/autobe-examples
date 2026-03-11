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

export async function test_api_comment_thread_retrieval_with_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connections with proper authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  const memberConnectionWithAuth: api.IConnection = { host: connection.host };
  memberConnectionWithAuth.headers = { Authorization: memberAuth.token.access };
  // 2. Create target post for testing
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnectionWithAuth,
    {
      body: {
        title: RandomGenerator.name(3),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create top-level comment
  const topLevelComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnectionWithAuth,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: null,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  // 4. Create first-level replies (replies to top-level comment)
  const firstLevelReplies = ArrayUtil.repeat(2, async (i) =>
    generate_random_reddit_like_member_posts_comments_create(
      memberConnectionWithAuth,
      {
        params: { postId: post.id },
        body: {
          content: `First level reply ${i + 1}`,
          parent_comment_id: topLevelComment.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    ),
  );
  // 5. Create second-level replies (replies to first-level replies)
  const firstLevelReplyResults = await Promise.all(firstLevelReplies);
  const secondLevelReplies = ArrayUtil.repeat(2, async (i) =>
    generate_random_reddit_like_member_posts_comments_create(
      memberConnectionWithAuth,
      {
        params: { postId: post.id },
        body: {
          content: `Second level reply ${i + 1}`,
          parent_comment_id:
            firstLevelReplyResults[i % firstLevelReplyResults.length].id,
        } satisfies IRedditLikeComment.ICreate,
      },
    ),
  );
  // Wait for all replies to be created
  await Promise.all(secondLevelReplies);
  // 6. Retrieve the parent comment with full thread
  const retrievedComment = await api.functional.redditLike.member.comments.at(
    memberConnectionWithAuth,
    {
      commentId: topLevelComment.id,
    },
  );
  typia.assert(retrievedComment);
  // 7. Validate the complete thread structure
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    topLevelComment.content,
  );
  TestValidator.equals(
    "author matches",
    retrievedComment.author.id,
    topLevelComment.author.id,
  );
  TestValidator.equals(
    "parent comment is null",
    retrievedComment.parentComment,
    null,
  );
  // Validate nested replies structure
  TestValidator.predicate(
    "has nested replies",
    retrievedComment.replies.length > 0,
  );
  // Check that replies are properly nested
  const hasFirstLevelReplies = retrievedComment.replies.some(
    (reply) => reply.parentComment !== null && reply.parentComment.id === topLevelComment.id,
  );
  TestValidator.predicate("has first level replies", hasFirstLevelReplies);
  // Verify vote scores are present
  TestValidator.predicate(
    "top level comment has vote score",
    typeof retrievedComment.vote_score === "number",
  );
  TestValidator.predicate(
    "replies have vote scores",
    retrievedComment.replies.every(
      (reply) => typeof reply.vote_score === "number",
    ),
  );
  // Verify timestamps are ISO format
  TestValidator.predicate(
    "created_at is valid ISO",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      retrievedComment.created_at,
    ),
  );
}