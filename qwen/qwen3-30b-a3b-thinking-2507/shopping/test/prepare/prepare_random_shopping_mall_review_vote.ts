import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";
export function prepare_random_shopping_mall_review_vote(
  input?: DeepPartial<IShoppingMallReviewVote.ICreate>,
): IShoppingMallReviewVote.ICreate {
  return {
    voteType:
      input?.voteType ?? RandomGenerator.pick(["like", "dislike"] as const),
  };
}
