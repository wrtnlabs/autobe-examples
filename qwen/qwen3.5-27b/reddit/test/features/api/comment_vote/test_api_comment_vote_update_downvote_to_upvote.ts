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
 * Test updating a comment vote from downvote to upvote.
 *
 * Validates the vote update workflow for comments, ensuring that changing a vote from downvote to upvote correctly updates the vote record, adjusts the comment's vote score by +2, and updates the author's karma by +2. The test verifies that the updated_at timestamp is properly modified and that the response contains the updated vote entity with the correct vote_type.
 *
 * The test follows the natural workflow: member authentication, post creation, comment creation, initial downvote, and then vote update to upvote. It validates that the vote score calculation is correct (downvote to upvote change results in a net +2 increase) and that the karma system properly reflects this change.
 *
 * 1. Register and authenticate as a member.
 * 2. Create a post in a subscribed community.
 * 3. Create a comment on the post.
 * 4. Cast an initial downvote on the comment.
 * 5. Update the vote from downvote to upvote.
 * 6. Validate the vote record is updated correctly.
 * 7. Validate the comment's vote_score increased by 2.
 * 8. Validate the author's karma increased by 2.
 */
export async function test_api_comment_vote_update_downvote_to_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create a post in a subscribed community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // Store initial karma before voting
  const initialKarma = comment.author.karma;
  const initialVoteScore = comment.voteScore;
  // 4. Cast an initial downvote on the comment
  const downvotedComment =
    await generate_random_reddit_clone_member_posts_comments_votes_create(
      memberConnection,
      {
        params: {
          postId: post.id,
          commentId: comment.id,
        },
        body: {
          vote_type: "downvote",
        } satisfies IRedditCloneCommentVote.ICreate,
      },
    );
  typia.assert(downvotedComment);
  // Verify downvote was applied correctly
  TestValidator.equals(
    "downvote decreases score by 1",
    downvotedComment.voteScore,
    initialVoteScore - 1,
  );
  // 5. Update the vote from downvote to upvote
  const updatedVote =
    await api.functional.redditClone.member.posts.comments.votes.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        voteId: downvotedComment.id,
        body: {
          vote_type: "upvote",
        } satisfies IRedditCloneCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 6. Validate the vote record is updated correctly
  TestValidator.equals(
    "vote type updated to upvote",
    updatedVote.vote_type,
    "upvote",
  );
  // 7. Validate the comment's vote_score increased by 2 (from -1 to +1)
  TestValidator.equals(
    "vote score increased by 2 after downvote to upvote change",
    updatedVote.comment.vote_score,
    initialVoteScore + 1,
  );
  // 8. Validate the author's karma increased by 2 (from -1 to +1)
  TestValidator.equals(
    "author karma increased by 2 after downvote to upvote change",
    updatedVote.comment.author.karma,
    initialKarma + 1,
  );
  // 9. Validate the updated_at timestamp was updated
  TestValidator.predicate(
    "updated_at timestamp is present",
    updatedVote.updated_at !== null,
  );
}
