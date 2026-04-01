import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_comment_vote(
  input?: DeepPartial<IRedditCommunityCommentVote.ICreate>,
): IRedditCommunityCommentVote.ICreate {
  return {
    direction:
      input?.direction ??
      RandomGenerator.pick(["UPVOTE", "DOWNVOTE", null] as const),
  };
}
