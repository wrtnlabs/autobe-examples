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
    skuCode: input?.skuCode ?? RandomGenerator.alphaNumeric(12),
    price:
      input?.price ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<1000000>>(),
    optionValues: input?.optionValues
      ? input.optionValues.map((option) => ({
          key:
            option.key ??
            RandomGenerator.pick([
              "color",
              "size",
              "material",
              "pattern",
            ] as const),
          value: option.value ?? RandomGenerator.name(1),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            key: RandomGenerator.pick([
              "color",
              "size",
              "material",
              "pattern",
            ] as const),
            value: RandomGenerator.name(1),
          }),
        ),
    stockQuantity:
      input?.stockQuantity ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
      >(),
  };
}
