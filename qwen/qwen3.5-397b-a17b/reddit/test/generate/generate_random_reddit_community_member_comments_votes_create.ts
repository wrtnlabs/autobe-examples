import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_comment_vote } from "../prepare/prepare_random_reddit_community_comment_vote";

/**
 * Generate a random Reddit community comment vote via the API for E2E testing.
 *
 * Prepares random vote data using the prepare function with a randomized vote value (+1 or -1),
 * then calls the vote creation endpoint for the specified comment. The vote is cast by the
 * authenticated member determined from the session.
 *
 * @param connection API connection information
 * @param props Optional body customization and required commentId URL parameter
 * @returns The created or updated vote record
 */
export async function generate_random_reddit_community_member_comments_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityCommentVote.ICreate>;
    params: {
      commentId: string;
    };
  },
): Promise<IRedditCommunityCommentVote> {
  const prepared: IRedditCommunityCommentVote.ICreate =
    prepare_random_reddit_community_comment_vote(props.body);
  const result: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: props.params.commentId,
        body: prepared,
      },
    );
  return result;
}
