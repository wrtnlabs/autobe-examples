import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_content_post_vote(
  input?: DeepPartial<IRedditCloneContentPostVote.ICreate>,
): IRedditCloneContentPostVote.ICreate {
  return {
    voteType:
      input?.voteType ??
      RandomGenerator.pick(["upvote", "downvote", "none"] as const),
  };
}
