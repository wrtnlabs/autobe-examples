import { IEcommerceMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewHelpfulnessVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_review_helpfulness_vote(
  input?: DeepPartial<IEcommerceMallReviewHelpfulnessVote.ICreate>,
): IEcommerceMallReviewHelpfulnessVote.ICreate {
  return {
    helpfulness:
      input?.helpfulness ?? RandomGenerator.pick([true, false] as const),
  };
}
