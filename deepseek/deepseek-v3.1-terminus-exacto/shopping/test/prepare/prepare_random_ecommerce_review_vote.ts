import { IEcommerceReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_review_vote(
  input?: DeepPartial<IEcommerceReviewVote.ICreate> | undefined,
): IEcommerceReviewVote.ICreate {
  return {
    review_id: input?.review_id ?? typia.random<string & tags.Format<"uuid">>(),
    helpful: input?.helpful ?? RandomGenerator.pick([true, false] as const),
  };
}
