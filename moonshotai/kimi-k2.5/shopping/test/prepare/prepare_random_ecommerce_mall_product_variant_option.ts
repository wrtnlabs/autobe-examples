import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_product_variant_option(
  input?: DeepPartial<IEcommerceMallProductVariantOption.ICreate>,
): IEcommerceMallProductVariantOption.ICreate {
  return {
    optionName:
      input?.optionName ??
      RandomGenerator.pick([
        "Color",
        "Size",
        "Material",
        "Style",
        "Weight",
      ] as const),
    optionValue: input?.optionValue ?? RandomGenerator.name(1),
  };
}
