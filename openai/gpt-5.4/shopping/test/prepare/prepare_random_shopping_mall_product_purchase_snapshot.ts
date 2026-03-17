import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_purchase_snapshot(
  input?: DeepPartial<IShoppingMallProductPurchaseSnapshot.ICreate>,
): IShoppingMallProductPurchaseSnapshot.ICreate {
  return {
    shopping_mall_product_id:
      input?.shopping_mall_product_id !== undefined
        ? input.shopping_mall_product_id
        : typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_variant_id:
      input?.shopping_mall_product_variant_id !== undefined
        ? input.shopping_mall_product_variant_id
        : typia.random<string & tags.Format<"uuid">>(),
    product_name:
      input?.product_name ??
      `${RandomGenerator.pick(["Premium", "Classic", "Modern", "Essential"] as const)} ${RandomGenerator.pick(["T-Shirt", "Sneakers", "Backpack", "Jacket", "Mug"] as const)}`,
    product_description:
      input?.product_description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 6,
        wordMin: 3,
        wordMax: 8,
      }),
    sku_code:
      input?.sku_code ?? `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    unit_price:
      input?.unit_price ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<500000>
      >(),
    optionValues: input?.optionValues
      ? input.optionValues.map((optionValue, index) => ({
          option_name:
            optionValue.option_name ??
            RandomGenerator.pick([
              "Color",
              "Size",
              "Material",
              "Style",
            ] as const),
          option_value:
            optionValue.option_value ??
            RandomGenerator.pick([
              "Red",
              "Blue",
              "Black",
              "White",
              "Small",
              "Medium",
              "Large",
              "Cotton",
              "Leather",
              "Classic",
            ] as const),
          display_order: optionValue.display_order ?? index,
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          (index) => ({
            option_name: RandomGenerator.pick([
              "Color",
              "Size",
              "Material",
            ] as const),
            option_value: RandomGenerator.pick([
              "Red",
              "Blue",
              "Black",
              "Small",
              "Medium",
              "Large",
              "Cotton",
            ] as const),
            display_order: index,
          }),
        ),
  };
}
