import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_variant(
  input?: DeepPartial<IShoppingMallProductVariant.ICreate>,
): IShoppingMallProductVariant.ICreate {
  return {
    sku_code: input?.sku_code ?? RandomGenerator.alphaNumeric(12),
    price:
      input?.price ??
      (typia.random<boolean>()
        ? typia.random<
            number &
              tags.Type<"double"> &
              tags.Minimum<1000> &
              tags.Maximum<999999>
          >()
        : null),
    stock_quantity:
      input?.stock_quantity ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
      >(),
    options: input?.options
      ? input.options.map((opt) => ({
          key:
            opt.key ??
            RandomGenerator.pick([
              "color",
              "size",
              "material",
              "style",
            ] as const),
          value: opt.value ?? RandomGenerator.name(1),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<4>
          >(),
          () => ({
            key: RandomGenerator.pick([
              "color",
              "size",
              "material",
              "style",
            ] as const),
            value: RandomGenerator.name(1),
          }),
        ),
  };
}
