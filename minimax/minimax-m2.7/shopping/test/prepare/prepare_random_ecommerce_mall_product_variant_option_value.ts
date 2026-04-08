import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_product_variant_option_value(
  input?: DeepPartial<IEcommerceMallProductVariantOptionValue.ICreate>,
): IEcommerceMallProductVariantOptionValue.ICreate {
  return {
    key:
      input?.key ??
      RandomGenerator.pick([
        "color",
        "size",
        "material",
        "style",
        "weight",
      ] as const),
    value: input?.value ?? RandomGenerator.alphabets(10),
  };
}
