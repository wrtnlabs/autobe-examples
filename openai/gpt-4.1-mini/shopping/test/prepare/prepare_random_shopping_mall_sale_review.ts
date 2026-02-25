import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_sale_review(
  input?: DeepPartial<IShoppingMallSaleReview.ICreate>,
): IShoppingMallSaleReview.ICreate {
  return {
    shoppingMallSaleId:
      input?.shoppingMallSaleId ?? typia.random<string & tags.Format<"uuid">>(),
    shoppingMallCustomerId:
      input?.shoppingMallCustomerId ??
      typia.random<string & tags.Format<"uuid">>(),
    rating:
      input?.rating ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    body: input?.body ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
