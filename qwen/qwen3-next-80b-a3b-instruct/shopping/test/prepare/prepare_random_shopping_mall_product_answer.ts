import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAnswer";
export function prepare_random_shopping_mall_product_answer(
  input?: DeepPartial<IShoppingMallProductAnswer.ICreate>,
): IShoppingMallProductAnswer.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
        >(),
        sentenceMin: 3,
        sentenceMax: 8,
        wordMin: 5,
        wordMax: 12,
      }),
  };
}
