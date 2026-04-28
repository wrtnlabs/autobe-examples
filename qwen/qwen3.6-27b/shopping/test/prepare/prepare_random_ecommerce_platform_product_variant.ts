import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random product variant creation data for E2E testing.
 *
 * Generates a complete IEcommercePlatformProductVariant.ICreate with randomized values
 * including a unique SKU code, optional price override, and required option configurations.
 *
 * The SKU code uses alphanumeric characters to create realistic product identifiers.
 * Price is optional and defaults to a non-negative uint32 value when not specified.
 * Options array contains at least one attribute key-value pair representing variant
 * configurations such as color, size, material, style, or weight.
 *
 * When input is provided, partial values from the input are used for customization.
 * All properties follow the DeepPartial semantics, allowing nested object overrides.
 * Array elements are also partial, enabling selective property customization.
 */
export function prepare_random_ecommerce_platform_product_variant(
  input?: DeepPartial<IEcommercePlatformProductVariant.ICreate>,
): IEcommercePlatformProductVariant.ICreate {
  return {
    skuCode: input?.skuCode ?? RandomGenerator.alphaNumeric(10),
    price:
      input?.price ??
      typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>(),
    options: input?.options
      ? input.options.map((option) => ({
          attributeKey:
            option.attributeKey ??
            RandomGenerator.pick([
              "color",
              "size",
              "material",
              "style",
              "weight",
            ] as const),
          attributeValue: option.attributeValue ?? RandomGenerator.name(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            attributeKey: RandomGenerator.pick([
              "color",
              "size",
              "material",
              "style",
              "weight",
            ] as const),
            attributeValue: RandomGenerator.name(),
          }),
        ),
  };
}
