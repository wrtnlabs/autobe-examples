import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

const OPTION_KEYS = ["color", "size", "material", "style", "weight"] as const;
const OPTION_VALUES: Record<(typeof OPTION_KEYS)[number], readonly string[]> = {
  color: ["Red", "Blue", "Green", "Black", "White"],
  size: ["Small", "Medium", "Large", "XLarge"],
  material: ["Cotton", "Polyester", "Leather", "Silk"],
  style: ["Classic", "Modern", "Vintage", "Casual"],
  weight: ["Light", "Medium", "Heavy"],
};
export function prepare_random_ecommerce_mall_product_variant_option_value(
  input?: DeepPartial<IEcommerceMallProductVariantOptionValue.ICreate>,
): IEcommerceMallProductVariantOptionValue.ICreate {
  const selectedKey = input?.key ?? RandomGenerator.pick(OPTION_KEYS);
  return {
    key: input?.key ?? (selectedKey as string),
    value:
      input?.value ??
      RandomGenerator.pick(
        OPTION_VALUES[selectedKey as (typeof OPTION_KEYS)[number]] ?? [
          "Default",
        ],
      ),
  };
}