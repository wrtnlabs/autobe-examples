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
 * Casts a vote (upvote, downvote, or remove vote) on a comment to influence its score and the author's karma.
 * The vote type is randomly selected from "upvote", "downvote", or null (to remove vote).
 * The comment must exist and belong to the specified post. The API returns the updated comment object
 * with the recalculated vote score after applying the vote.
 *
 * Vote scores are calculated as the total number of upvotes minus downvotes. Each user can only have
 * one vote per comment, and changing a vote updates the existing record rather than creating a duplicate.
 */
export async function generate_random_reddit_clone_member_posts_comments_votes_create(
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
    await api.functional.redditClone.member.posts.comments.votes.create(
      connection,
      {
        body: prepared,
        postId: props.params.postId,
        commentId: props.params.commentId,
      },
    );
  return result;
}
