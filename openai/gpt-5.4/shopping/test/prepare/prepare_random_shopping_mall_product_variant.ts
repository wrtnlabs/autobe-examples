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
    sku_code:
      input?.sku_code ??
      `SKU-${RandomGenerator.alphaNumeric(12).toUpperCase()}`,
    option_summary:
      input?.option_summary ??
      `${RandomGenerator.pick(["Color", "Size", "Material", "Style"] as const)}: ${RandomGenerator.name(1)}, ${RandomGenerator.pick(["Fit", "Capacity", "Length", "Edition"] as const)}: ${RandomGenerator.name(1)}`,
    price:
      input?.price !== undefined
        ? input.price
        : typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<500000>
          >(),
  };
}
