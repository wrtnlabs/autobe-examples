import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
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
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_comments_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_votes_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_comment_vote } from "../../../prepare/prepare_random_reddit_clone_comment_vote";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test changing a comment vote from upvote to downvote, verifying score and karma adjustments.
 *
 * Validates that when a member changes their vote on a comment from upvote to downvote, the system correctly updates the vote record (not creates a duplicate), adjusts the comment's vote score by -2 (from +1 to -1), and decreases the comment author's karma by 2.
 *
 * This test ensures proper vote change handling where the existing vote is updated rather than duplicated, and both the comment score and author karma are correctly recalculated.
 *
 * 1. Authenticate as voter member who will cast and change votes
 * 2. Authenticate as comment author member and create a post in a community
 * 3. Create a comment on the post as the comment author
 * 4. Record initial karma of comment author
 * 5. As voter, cast an upvote on the comment (vote_score becomes +1, author karma +1)
 * 6. As same voter, change vote from upvote to downvote
 * 7. Verify vote_score changed from +1 to -1 (decrease of 2)
 * 8. Verify comment author's karma decreased by 2 from the upvote state
 */
export async function test_api_comment_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as voter
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Authenticate as comment author and create post
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorAuth);
  // Create a post as author
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {},
  );
  typia.assert(post);
  // 3. Create a comment as author
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // Record initial state
  const initialVoteScore = comment.voteScore;
  const initialAuthorKarma = comment.author.karma;
  // 4. Voter casts upvote
  const upvotedComment =
    await generate_random_reddit_clone_member_posts_comments_votes_create(
      voterConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: { vote_type: "upvote" },
      },
    );
  typia.assert(upvotedComment);
  // Verify upvote increased score by 1
  TestValidator.equals(
    "upvote increases comment score by 1",
    upvotedComment.voteScore,
    initialVoteScore + 1,
  );
  // Verify author karma increased by 1 after upvote
  TestValidator.equals(
    "upvote increases author karma by 1",
    upvotedComment.author.karma,
    initialAuthorKarma + 1,
  );
  const karmaAfterUpvote = upvotedComment.author.karma;
  // 5. Voter changes vote from upvote to downvote
  const downvotedComment =
    await generate_random_reddit_clone_member_posts_comments_votes_create(
      voterConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: { vote_type: "downvote" },
      },
    );
  typia.assert(downvotedComment);
  // 6. Verify vote_score changed from +1 to -1 (decrease of 2 from upvote state)
  TestValidator.equals(
    "vote change from upvote to downvote decreases score by 2",
    downvotedComment.voteScore,
    initialVoteScore - 1,
  );
  // 7. Verify author karma decreased by 2 from upvote state (from +1 to -1)
  TestValidator.equals(
    "vote change decreases author karma by 2",
    downvotedComment.author.karma,
    karmaAfterUpvote - 2,
  );
  // 8. Verify final karma is initial minus 1 (net effect of downvote)
  TestValidator.equals(
    "final author karma is initial minus 1",
    downvotedComment.author.karma,
    initialAuthorKarma - 1,
  );
}
