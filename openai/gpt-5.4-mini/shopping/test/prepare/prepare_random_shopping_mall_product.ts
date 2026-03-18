import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product(
  input?: DeepPartial<IShoppingMallProduct.ICreate> | undefined,
): IShoppingMallProduct.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
        wordMin: 4,
        wordMax: 8,
      }),
    shopping_mall_category_id: input?.shopping_mall_category_id ?? null,
    base_price:
      input?.base_price ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<100000>
      >(),
  };
}
