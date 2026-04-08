import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_comment_vote } from "../prepare/prepare_random_reddit_community_comment_vote";

/**
 * Generate a random comment vote on an existing comment for E2E testing.
 *
 * Creates a vote (upvote or downvote) attached to the comment specified by
 * commentId within the post specified by postId. This operation casts a vote
 * for the authenticated member on a specific comment content.
 *
 * The vote is randomly generated as either an "upvote" or "downvote" using
 * the prepare_random_reddit_community_comment_vote helper function. The vote
 * record will be created or updated (if the member has already voted on this
 * comment), contributing to the comment's net score and the author's karma.
 */
export async function generate_random_reddit_community_member_posts_comments_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityCommentVote.ICreate> | undefined;
    params: {
      postId: string;
      commentId: string;
    };
  },
): Promise<IRedditCommunityCommentVote> {
  const prepared: IRedditCommunityCommentVote.ICreate =
    prepare_random_reddit_community_comment_vote(props.body);
  const result: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.member.posts.comments.votes.create(
      connection,
      {
        postId: props.params.postId,
        commentId: props.params.commentId,
        body: prepared,
      },
    );
  return result;
}
