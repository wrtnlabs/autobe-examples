import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random comment vote creation data for E2E testing.
 *
 * Generates a complete ICommunityPlatformCommentVote.ICreate with a random
 * vote value of either +1 (upvote) or -1 (downvote).
 *
 * @param input Optional partial input to override specific fields
 * @returns A complete ICommunityPlatformCommentVote.ICreate with all fields populated
 */
export function prepare_random_community_platform_comment_vote(
  input?: DeepPartial<ICommunityPlatformCommentVote.ICreate> | undefined,
): ICommunityPlatformCommentVote.ICreate {
  return {
    value:
      input?.value ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<-1> & tags.Maximum<1>
      >(),
  };
}
