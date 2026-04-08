import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random product variant creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallProductVariant.ICreate with randomized values.
 * The variant requires a unique SKU code and at least one option value pair
 * (e.g., color: Red, size: Large). Price is optional - when null, the product's
 * base price applies.
 *
 * @param input Optional partial overrides for customization
 * @returns Complete product variant creation data
 */
export function prepare_random_ecommerce_mall_product_variant(
  input?: DeepPartial<IEcommerceMallProductVariant.ICreate>,
): IEcommerceMallProductVariant.ICreate {
  // Common option keys for realistic product variants
  const OPTION_KEYS = [
    "Color",
    "Size",
    "Material",
    "Style",
    "Weight",
    "Capacity",
  ] as const;
  const OPTION_VALUES = [
    "Red",
    "Blue",
    "Green",
    "Black",
    "White",
    "Small",
    "Medium",
    "Large",
    "XL",
    "Cotton",
    "Polyester",
    "Leather",
    "Metal",
  ] as const;
  return {
    skuCode:
      input?.skuCode ??
      (() => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < 16; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      })(),
    price: input?.price ?? null,
    optionValues: input?.optionValues
      ? input.optionValues.map(
          (ov): IEcommerceMallProductVariantOptionValue.ICreate => ({
            key: ov.key ?? RandomGenerator.pick(OPTION_KEYS),
            value: ov.value ?? RandomGenerator.pick(OPTION_VALUES),
          }),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          (): IEcommerceMallProductVariantOptionValue.ICreate => ({
            key: RandomGenerator.pick(OPTION_KEYS),
            value: RandomGenerator.pick(OPTION_VALUES),
          }),
        ),
  };
}
