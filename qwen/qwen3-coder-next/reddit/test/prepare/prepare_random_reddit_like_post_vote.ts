import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_post_vote(
  input?: DeepPartial<IRedditLikePostVote.ICreate> | undefined,
): IRedditLikePostVote.ICreate {
  return {
    value:
      input?.value ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<-1> & tags.Maximum<1>
      >(),
  };
}
