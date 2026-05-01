import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall product variant creation data for E2E testing.
 *
 * Generates a complete IShoppingMallProductVariant.ICreate with randomized values. The variant includes a globally unique SKU code, option key-value pairs defining distinguishing attributes (e.g., color, size), an optional price override, and an optional initial stock quantity.
 *
 * The function uses DeepPartial input to allow test callers to override any specific property. When properties are omitted from the input, sensible random defaults are generated.
 *
 * Option values are generated as 1 to 3 random pairs using alphabetic keys and name-like values. When input optionValues are provided, each element's key and value can be individually overridden; any omitted sub-property receives a random default.
 *
 * The price field accepts number, null, or undefined. When omitted (undefined) or explicitly null, a random non-negative integer is generated. The initial stock quantity defaults to a random non-negative integer when not provided.
 */
export function prepare_random_shopping_mall_product_variant(
  input?: DeepPartial<IShoppingMallProductVariant.ICreate>,
): IShoppingMallProductVariant.ICreate {
  return {
    code: input?.code ?? RandomGenerator.alphaNumeric(10),
    price:
      input?.price ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    optionValues: input?.optionValues
      ? input.optionValues.map((ov) => ({
          key: ov.key ?? RandomGenerator.alphabets(8),
          value: ov.value ?? RandomGenerator.name(1),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            key: RandomGenerator.alphabets(8),
            value: RandomGenerator.name(1),
          }),
        ),
    initialStockQuantity:
      input?.initialStockQuantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  };
}
