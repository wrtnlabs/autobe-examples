import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

const OPTION_KEYS = ["color", "size", "material", "style", "weight"] as const;
const COLOR_VALUES = [
  "Red",
  "Blue",
  "Green",
  "Black",
  "White",
  "Yellow",
  "Gray",
] as const;
const SIZE_VALUES = ["S", "M", "L", "XL", "XXL"] as const;
const MATERIAL_VALUES = [
  "Cotton",
  "Polyester",
  "Leather",
  "Silk",
  "Wool",
] as const;
export function prepare_random_ecommerce_mall_product_variant(
  input?: DeepPartial<IEcommerceMallProductVariant.ICreate>,
): IEcommerceMallProductVariant.ICreate {
  return {
    sku_code: input?.sku_code ?? RandomGenerator.alphaNumeric(16),
    price:
      input?.price ??
      typia.random<
        number & tags.Type<"double"> & tags.Minimum<1000> & tags.Maximum<999999>
      >(),
    quantity:
      input?.quantity ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
      >(),
    option_values: input?.option_values
      ? input.option_values.map((option) => ({
          key: option.key ?? RandomGenerator.pick(OPTION_KEYS),
          value: option.value ?? RandomGenerator.pick(COLOR_VALUES),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            key: RandomGenerator.pick(OPTION_KEYS),
            value: RandomGenerator.pick(COLOR_VALUES),
          }),
        ),
  };
}
