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
 * Test comment retrieval with accurate vote score calculations.
 *
 * Validates the comment vote score aggregation system by creating multiple member accounts, casting votes from different members, and verifying the vote score is correctly calculated in real-time. The test ensures that vote score changes are immediately reflected when retrieved.
 *
 * The test follows a complete workflow: member account creation, post creation, comment creation, voting operations from multiple members, and vote score validation at each step.
 *
 * 1. Create three member accounts with unique credentials.
 * 2. Create a text post in a community using the first member.
 * 3. Create a comment on the post using the first member.
 * 4. Cast an upvote on the comment from the second member.
 * 5. Cast a downvote on the comment from the third member.
 * 6. Retrieve the comment and validate vote_score equals 0 (1 upvote - 1 downvote).
 * 7. Change the second member's vote from upvote to downvote.
 * 8. Retrieve the comment and validate vote_score equals -2 (0 upvotes - 2 downvotes).
 * 9. Change the third member's vote from downvote to upvote.
 * 10. Retrieve the comment and validate vote_score equals 0 (1 upvote - 1 downvote).
 */
export async function test_api_comment_retrieval_with_vote_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three member accounts for voting
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member2);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member3);
  // 2. Create a post in a community (using member1)
  const post = await generate_random_reddit_like_member_posts_create(
    member1Connection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post (using member1)
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      member1Connection,
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
  // 4. Cast upvote from member2 on the comment
  const upvote = await generate_random_reddit_like_member_comments_votes_create(
    member2Connection,
    {
      body: {
        vote_type: "upvote",
      } satisfies IRedditLikeVote.ICreate,
      params: {
        commentId: comment.id,
      },
    },
  );
  typia.assert(upvote);
  // 5. Cast downvote from member3 on the comment
  const downvote =
    await generate_random_reddit_like_member_comments_votes_create(
      member3Connection,
      {
        body: {
          vote_type: "downvote",
        } satisfies IRedditLikeVote.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(downvote);
  // 6. Retrieve comment and validate vote_score is 0 (1 upvote - 1 downvote)
  let retrievedComment =
    await api.functional.redditLike.member.posts.comments.at(
      member1Connection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);
  TestValidator.equals(
    "vote score after upvote and downvote",
    retrievedComment.vote_score,
    0,
  );
  // 7. Change member2's vote from upvote to downvote
  const updatedVote =
    await generate_random_reddit_like_member_comments_votes_create(
      member2Connection,
      {
        body: {
          vote_type: "downvote",
        } satisfies IRedditLikeVote.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(updatedVote);
  // 8. Retrieve comment and validate vote_score is -2 (0 upvotes - 2 downvotes)
  retrievedComment = await api.functional.redditLike.member.posts.comments.at(
    member1Connection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  typia.assert(retrievedComment);
  TestValidator.equals(
    "vote score after changing upvote to downvote",
    retrievedComment.vote_score,
    -2,
  );
  // 9. Change member3's vote from downvote to upvote
  const removedVote =
    await generate_random_reddit_like_member_comments_votes_create(
      member3Connection,
      {
        body: {
          vote_type: "upvote",
        } satisfies IRedditLikeVote.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(removedVote);
  // 10. Retrieve comment and validate vote_score is 0 (1 upvote - 1 downvote)
  retrievedComment = await api.functional.redditLike.member.posts.comments.at(
    member1Connection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  typia.assert(retrievedComment);
  TestValidator.equals(
    "vote score after changing downvote to upvote",
    retrievedComment.vote_score,
    0,
  );
}