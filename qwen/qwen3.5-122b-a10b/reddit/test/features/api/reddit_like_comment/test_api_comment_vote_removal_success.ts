import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_comments_votes_create } from "../../../generate/generate_random_reddit_like_member_comments_votes_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

/**
 * Test successful vote removal from a comment.
 *
 * Validates that a member can successfully remove their vote from a comment they previously voted on. The test verifies the complete vote removal workflow including vote casting, vote removal via DELETE endpoint, and successful completion without errors.
 *
 * 1. Two members are created and authenticated (voter and comment author).
 * 2. Author creates a post in a community.
 * 3. Author creates a comment on the post.
 * 4. Voter casts an upvote on the comment.
 * 5. Voter removes their vote via DELETE endpoint.
 * 6. Verifies vote removal completes successfully (204 No Content).
 */
export async function test_api_comment_vote_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test member who will cast and remove the vote
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(voter);
  // 2. Create another member who will own the comment
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(author);
  // 3. Create a community ID (placeholder - should exist in test environment)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create a post by the author
  const post = await generate_random_reddit_like_member_posts_create(
    authorConnection,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post by the author
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      authorConnection,
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
  // 6. Cast an upvote on the comment by the voter
  const vote = await generate_random_reddit_like_member_comments_votes_create(
    voterConnection,
    {
      body: {
        vote_type: "upvote",
      } satisfies IRedditLikeVote.ICreate,
      params: {
        commentId: comment.id,
      },
    },
  );
  typia.assert(vote);
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");
  // 7. Verify vote was created successfully
  TestValidator.predicate("vote exists", vote.id !== undefined);
  // 8. Remove the vote via DELETE endpoint
  await api.functional.redditLike.member.comments.votes.erase(voterConnection, {
    commentId: comment.id,
  });
}
