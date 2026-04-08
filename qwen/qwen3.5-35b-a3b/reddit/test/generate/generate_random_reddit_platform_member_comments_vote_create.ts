import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_comment_vote } from "../prepare/prepare_random_reddit_platform_comment_vote";

/**
 * Generate a random comment vote via the API for E2E testing.
 *
 * Creates a vote record (upvote, downvote, or remove vote) on a specific comment
 * for testing purposes. The vote type is randomly generated as 'up', 'down', or
 * null (remove vote). This function is useful for testing comment voting behavior,
 * score calculations, and member interaction with comments.
 */
export async function generate_random_reddit_platform_member_comments_vote_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformCommentVote.ICreate>;
    params: {
      commentId: string;
    };
  },
): Promise<IRedditPlatformCommentVote> {
  const prepared: IRedditPlatformCommentVote.ICreate =
    prepare_random_reddit_platform_comment_vote(props.body);
  const result: IRedditPlatformCommentVote =
    await api.functional.redditPlatform.member.comments.vote.create(
      connection,
      {
        body: prepared,
        commentId: props.params.commentId,
      },
    );
  return result;
}
