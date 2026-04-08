import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall product variant creation data for E2E testing.
 *
 * Generates a complete IShoppingMallProductVariant.ICreate with randomized SKU code,
 * optional price override, variant option key-value pairs, and initial stock quantity.
 * The variant options define characteristics like color, size, and material that
 * distinguish this variant from others within the same product.
 */
export function prepare_random_shopping_mall_product_variant(
  input?: DeepPartial<IShoppingMallProductVariant.ICreate> | undefined,
): IShoppingMallProductVariant.ICreate {
  return {
    sku_code: input?.sku_code ?? RandomGenerator.alphaNumeric(12),
    price:
      input?.price ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<999999>
      >(),
    variantOptions: input?.variantOptions
      ? input.variantOptions.map((option) => ({
          key:
            option.key ??
            RandomGenerator.pick([
              "color",
              "size",
              "material",
              "pattern",
              "style",
              "capacity",
            ] as const),
          value: option.value ?? RandomGenerator.name(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            key: RandomGenerator.pick([
              "color",
              "size",
              "material",
              "pattern",
              "style",
              "capacity",
            ] as const),
            value: RandomGenerator.name(),
          }),
        ),
    initialStockQuantity:
      input?.initialStockQuantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  };
}
