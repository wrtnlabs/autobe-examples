import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product(
  input?: DeepPartial<IShoppingMallProduct.ICreate>,
): IShoppingMallProduct.ICreate {
  return {
    base_price:
      input?.base_price ??
      typia.random<
        number &
          tags.Type<"uint32"> &
          tags.Minimum<1000> &
          tags.Maximum<10000000>
      >(),
    category_id:
      input?.category_id ?? typia.random<string & tags.Format<"uuid">>(),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    name: input?.name ?? RandomGenerator.name(3),
  };
}
