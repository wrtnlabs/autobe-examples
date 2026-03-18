import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_variant(
  input?: DeepPartial<IShoppingMallProductVariant.ICreate> | undefined,
): IShoppingMallProductVariant.ICreate {
  return {
    shopping_mall_product_id:
      input?.shopping_mall_product_id ??
      typia.random<string & tags.Format<"uuid">>(),
    code: input?.code ?? RandomGenerator.alphabets(12),
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 2 }),
    option_value:
      input?.option_value ??
      RandomGenerator.pick([
        "Red",
        "Blue",
        "Green",
        "Black",
        "White",
        "Large",
        "Medium",
        "Small",
      ] as const),
    price:
      input?.price ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999999>
      >(),
    is_active: input?.is_active ?? typia.random<boolean>(),
  };
}
