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
    shopping_mall_category_id:
      input?.shopping_mall_category_id !== undefined
        ? input.shopping_mall_category_id
        : RandomGenerator.pick([
            null,
            typia.random<string & tags.Format<"uuid">>(),
          ] as const),
    name: input?.name ?? RandomGenerator.name(3),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 8,
        wordMin: 3,
        wordMax: 8,
      }),
    base_price:
      input?.base_price ??
      typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
    status:
      input?.status ??
      RandomGenerator.pick([
        "draft",
        "active",
        "inactive",
        "sold_out",
      ] as const),
  };
}
