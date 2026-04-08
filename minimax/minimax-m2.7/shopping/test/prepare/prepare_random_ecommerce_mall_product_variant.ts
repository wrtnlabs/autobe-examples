import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_product_variant(
  input?: DeepPartial<IEcommerceMallProductVariant.ICreate>,
): IEcommerceMallProductVariant.ICreate {
  return {
    optionValues: input?.optionValues
      ? input.optionValues.map((ov) => ({
          key: ov.key ?? RandomGenerator.alphabets(8),
          value: ov.value ?? RandomGenerator.alphabets(8),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            key: RandomGenerator.alphabets(8),
            value: RandomGenerator.alphabets(8),
          }),
        ),
    price:
      input?.price ??
      (Math.random() > 0.3
        ? typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<100> &
              tags.Maximum<99999>
          >()
        : null),
    quantity:
      input?.quantity ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
      >(),
    skuCode: input?.skuCode ?? RandomGenerator.alphaNumeric(16),
  };
}
