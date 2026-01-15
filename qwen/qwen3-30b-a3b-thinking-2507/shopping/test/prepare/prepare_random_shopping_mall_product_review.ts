import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
export function prepare_random_shopping_mall_product_review(
  input?: DeepPartial<IShoppingMallProductReview.ICreate> | undefined,
): IShoppingMallProductReview.ICreate {
  return {
    rating:
      input?.rating ??
      typia.random<number & tags.Minimum<1> & tags.Maximum<5>>(),
    comment:
      input?.comment ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        wordMin: 5,
      }),
  };
}
