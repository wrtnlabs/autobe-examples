import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_comment_vote } from "../prepare/prepare_random_reddit_like_community_comment_vote";

/**
 * Generate a random Reddit-like community comment vote via the API for E2E testing.
 *
 * Prepares random comment vote data using the prepare function, then calls the creation endpoint.
 * The vote is cast on the comment specified by the provided comment ID.
 * This function represents the operation of creating a vote on a comment to express agreement
 * or disagreement with the content.
 */
export async function generate_random_reddit_like_community_member_comments_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeCommunityCommentVote.ICreate>;
    params?: {
      commentId: string;
    };
  },
): Promise<IRedditLikeCommunityCommentVote> {
  const prepared: IRedditLikeCommunityCommentVote.ICreate =
    prepare_random_reddit_like_community_comment_vote(props.body);
  const result: IRedditLikeCommunityCommentVote =
    await api.functional.redditLikeCommunity.member.comments.votes.create(
      connection,
      {
        commentId: typia.assert<string & tags.Format<"uuid">>(props.params!.commentId),
        body: prepared,
      },
    );
  return result;
}
