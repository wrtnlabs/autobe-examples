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
    skuCode: input?.skuCode ?? RandomGenerator.alphaNumeric(10),
    optionValues: input?.optionValues
      ? input.optionValues.map((option) => ({
          key: option.key ?? RandomGenerator.alphabets(6),
          value: option.value ?? RandomGenerator.paragraph({ sentences: 1 }),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            key: RandomGenerator.alphabets(6),
            value: RandomGenerator.paragraph({ sentences: 1 }),
          }),
        ),
    price:
      input?.price ??
      (Math.random() < 0.3
        ? null
        : typia.random<number & tags.Type<"double"> & tags.Minimum<0>>()),
    stockQuantity:
      input?.stockQuantity ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10000>
      >(),
  };
}
