import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
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

/**
 * Test authenticated member comment retrieval by ID within a post.
 *
 * Validates that an authenticated member can successfully retrieve a single comment using its unique identifier within a specific post context. The test exercises the complete comment lifecycle from creation through retrieval, ensuring all comment entity fields are properly populated in the response.
 *
 * This test verifies the primary success path for comment retrieval, including proper author information joining, post context association, and initial vote score calculation. It ensures that top-level comments have null parent references and that all timestamps are correctly set.
 *
 * 1. Create and authenticate a member account using the join utility.
 * 2. Create a text post in a community using the member connection.
 * 3. Create a top-level comment on the post using the member connection.
 * 4. Retrieve the comment using the GET endpoint with postId and commentId.
 * 5. Validate the response contains all required comment entity fields with correct types.
 */
export async function test_api_comment_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create a text post in a community
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberConnection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.alphaNumeric(20),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);
  // 3. Create a top-level comment on the post
  const comment: IRedditLikeComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 4. Retrieve the comment using the GET endpoint
  const retrieved: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.at(memberConnection, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(retrieved);
  // 5. Validate business logic - id and content match
  TestValidator.equals("comment id matches", retrieved.id, comment.id);
  TestValidator.equals("content matches", retrieved.content, comment.content);
  TestValidator.equals("author id matches", retrieved.author.id, member.id);
  TestValidator.equals(
    "author username matches",
    retrieved.author.username,
    member.username,
  );
  TestValidator.equals("post id matches", retrieved.post.id, post.id);
  TestValidator.equals("post title matches", retrieved.post.title, post.title);
  TestValidator.predicate(
    "parent is null for top-level comment",
    retrieved.parent === null,
  );
  TestValidator.predicate(
    "vote score is 0 initially",
    retrieved.vote_score === 0,
  );
  TestValidator.predicate(
    "deleted_at is null for active comment",
    retrieved.deleted_at === null,
  );
}