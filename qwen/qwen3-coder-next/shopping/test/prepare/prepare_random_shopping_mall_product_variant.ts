import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_variant(
  input?: DeepPartial<IShoppingMallProductVariant.ICreate> | undefined,
): IShoppingMallProductVariant.ICreate {
  return {
    sku_code: input?.sku_code ?? RandomGenerator.alphaNumeric(10),
    option_values: input?.option_values
      ? input.option_values.map((val) => ({
          option_name: val.option_name ?? RandomGenerator.alphabets(8),
          option_value: val.option_value ?? RandomGenerator.alphabets(8),
        }))
      : ArrayUtil.repeat(RandomGenerator.pick([1, 2, 3] as const), () => ({
          option_name: RandomGenerator.alphabets(8),
          option_value: RandomGenerator.alphabets(8),
        })),
    price_override:
      input?.price_override ??
      (Math.random() > 0.5
        ? null
        : typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1> &
              tags.Maximum<1000000>
          >()),
    stock_quantity:
      input?.stock_quantity ??
      (Math.random() > 0.3
        ? typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10000>
          >()
        : undefined),
  };
}
