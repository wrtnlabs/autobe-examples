import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_post_vote(
  input?: DeepPartial<IRedditCommunityPostVote.ICreate>,
): IRedditCommunityPostVote.ICreate {
  return {
    vote_type:
      input?.vote_type ?? RandomGenerator.pick(["upvote", "downvote"] as const),
  };
}
