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
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    content:
      input?.content ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 4,
        wordMax: 8,
      }),
    title:
      input?.title ??
      RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
