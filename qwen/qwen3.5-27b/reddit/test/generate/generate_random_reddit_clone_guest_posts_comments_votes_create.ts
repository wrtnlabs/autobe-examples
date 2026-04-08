import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_comment_vote } from "../prepare/prepare_random_reddit_clone_comment_vote";

/**
 * Generate a random comment vote on a Reddit clone comment for E2E testing.
 *
 * Casts a vote (upvote, downvote, or remove) on a comment to influence its score
 * and the author's karma. The vote type can be "upvote" to increase the comment's
 * score by 1, "downvote" to decrease the score by 1, or null to remove the vote
 * entirely. The function returns the updated comment object with the new vote
 * score calculated after applying the vote.
 *
 * This generation function requires both postId and commentId parameters to
 * identify the specific comment to vote on. The vote operation updates the
 * comment's vote score immediately and returns the full comment object with
 * the updated score.
 */
export async function generate_random_reddit_clone_guest_posts_comments_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneCommentVote.ICreate> | undefined;
    params: {
      postId: string;
      commentId: string;
    };
  },
): Promise<IRedditCloneComment> {
  const prepared: IRedditCloneCommentVote.ICreate =
    prepare_random_reddit_clone_comment_vote(props.body);
  const result: IRedditCloneComment =
    await api.functional.redditClone.guest.posts.comments.votes.create(
      connection,
      {
        postId: props.params.postId,
        commentId: props.params.commentId,
        body: prepared,
      },
    );
  return result;
}
