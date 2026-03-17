import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_review(
  input?: DeepPartial<IShoppingMallReview.ICreate>,
): IShoppingMallReview.ICreate {
  return {
    shopping_mall_product_id:
      input?.shopping_mall_product_id ??
      typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id:
      input?.shopping_mall_order_id ??
      typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_item_id:
      input?.shopping_mall_order_item_id ??
      typia.random<string & tags.Format<"uuid">>(),
    rating: input?.rating ?? RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    content:
      input?.content !== undefined
        ? input.content
        : RandomGenerator.paragraph({ sentences: 3 }),
  };
}
