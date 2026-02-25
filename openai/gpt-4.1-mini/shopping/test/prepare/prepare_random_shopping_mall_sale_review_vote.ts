import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_sale_review_vote(
  input?: DeepPartial<IShoppingMallSaleReviewVote.ICreate>,
): IShoppingMallSaleReviewVote.ICreate {
  return {
    shoppingMallProductReviewId:
      input?.shoppingMallProductReviewId ??
      typia.random<string & tags.Format<"uuid">>(),
    voterId: input?.voterId ?? typia.random<string & tags.Format<"uuid">>(),
    actorType:
      input?.actorType ?? RandomGenerator.pick(["customer", "seller"] as const),
  };
}
