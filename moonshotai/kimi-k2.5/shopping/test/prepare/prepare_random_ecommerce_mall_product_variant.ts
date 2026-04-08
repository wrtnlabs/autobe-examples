import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_product_variant(
  input?: DeepPartial<IEcommerceMallProductVariant.ICreate>,
): IEcommerceMallProductVariant.ICreate {
  return {
    skuCode: input?.skuCode ?? RandomGenerator.alphaNumeric(8).toUpperCase(),
    price:
      input?.price ??
      (RandomGenerator.pick([true, false])
        ? typia.random<number & tags.Minimum<0>>()
        : null),
    options: input?.options
      ? input.options.map((option) => ({
          optionName: option.optionName ?? RandomGenerator.name(1),
          optionValue: option.optionValue ?? RandomGenerator.name(1),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            optionName: RandomGenerator.name(1),
            optionValue: RandomGenerator.name(1),
          }),
        ),
  };
}
