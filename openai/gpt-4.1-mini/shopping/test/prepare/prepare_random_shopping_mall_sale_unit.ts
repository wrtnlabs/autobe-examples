import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_sale_unit(
  input?: DeepPartial<IShoppingMallSaleUnit.ICreate>,
): IShoppingMallSaleUnit.ICreate {
  return {
    sku_code: input?.sku_code ?? RandomGenerator.alphaNumeric(12),
    option_values:
      input?.option_values ??
      JSON.stringify({
        color: RandomGenerator.name(1),
        size: RandomGenerator.pick(["S", "M", "L", "XL"]),
        material: RandomGenerator.name(1),
      }),
    price_override:
      input?.price_override ??
      (RandomGenerator.pick([true, false])
        ? typia.random<number & tags.Type<"double"> & tags.Minimum<0>>()
        : null),
  };
}
