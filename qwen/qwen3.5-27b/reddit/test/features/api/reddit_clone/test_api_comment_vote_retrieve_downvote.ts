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
 * Test retrieving a comment vote record after casting a downvote.
 *
 * Validates the complete workflow of creating a downvote on a comment and verifying the vote effect. Ensures that the downvote is correctly applied, which contributes -1 to the comment's score. Verifies member authentication, post and comment creation, and vote application.
 *
 * Note: The vote creation endpoint returns the updated comment rather than the vote record with voteId. Therefore, this test validates the downvote effect on the comment's voteScore rather than retrieving the vote record directly. To retrieve a vote record, the voteId would be required, which is not currently returned by the creation endpoint.
 *
 * 1. Register a new member account and authenticate.
 * 2. Create a post that will contain the comment to be voted on.
 * 3. Create a comment on the post that will receive the downvote.
 * 4. Cast a downvote on the comment.
 * 5. Validate that the comment's voteScore reflects the downvote (should be -1 for a new comment with one downvote).
 * 6. Validate that the comment references (id, post id) remain correct after voting.
 */
export async function test_api_comment_vote_retrieve_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a post
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
        body: {},
      },
    );
  typia.assert(comment);
  // Validate initial comment state (should have voteScore of 0 before any votes)
  TestValidator.equals(
    "initial comment voteScore is zero",
    comment.voteScore,
    0,
  );
  // 4. Cast a downvote on the comment
  const voteBody = {
    vote_type: "downvote" as const,
  } satisfies IRedditCloneCommentVote.ICreate;
  const updatedComment =
    await generate_random_reddit_clone_member_posts_comments_votes_create(
      memberConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: voteBody,
      },
    );
  typia.assert(updatedComment);
  // 5. Validate that the downvote was applied correctly
  // A new comment with one downvote should have voteScore of -1
  TestValidator.equals(
    "comment voteScore reflects downvote",
    updatedComment.voteScore,
    -1,
  );
  // 6. Validate that comment references remain correct after voting
  TestValidator.equals(
    "comment id matches after voting",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "post id matches after voting",
    updatedComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment author matches member",
    updatedComment.author.id,
    member.id,
  );
  // Validate timestamps are present
  TestValidator.predicate(
    "comment has valid created_at timestamp",
    updatedComment.created_at !== null && updatedComment.created_at.length > 0,
  );
  TestValidator.predicate(
    "comment has valid updated_at timestamp",
    updatedComment.updated_at !== null && updatedComment.updated_at.length > 0,
  );
  // Validate content is preserved
  TestValidator.equals(
    "comment content preserved after voting",
    updatedComment.content,
    comment.content,
  );
}
