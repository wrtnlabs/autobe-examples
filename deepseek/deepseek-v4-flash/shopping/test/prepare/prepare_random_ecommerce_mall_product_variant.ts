import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random product variant (SKU) creation data for E2E testing.
 *
 * Generates a complete IECommerceMallProductVariant.ICreate with randomized values.
 * The function accepts an optional `DeepPartial` input to override specific fields
 * during testing, while filling remaining properties with generated data.
 *
 * @param input Partial input to override generated default values
 * @returns A fully populated IECommerceMallProductVariant.ICreate instance
 */
export function prepare_random_ecommerce_mall_product_variant(
  input?: DeepPartial<IECommerceMallProductVariant.ICreate> | undefined,
): IECommerceMallProductVariant.ICreate {
  return {
    sku_code: input?.sku_code ?? RandomGenerator.alphaNumeric(12),
    price:
      input?.price ??
      typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
    options: input?.options
      ? input.options.map((option) => ({
          key: option.key ?? RandomGenerator.alphabets(6),
          value: option.value ?? RandomGenerator.alphabets(8),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            key: RandomGenerator.alphabets(6),
            value: RandomGenerator.alphabets(8),
          }),
        ),
  };
}
