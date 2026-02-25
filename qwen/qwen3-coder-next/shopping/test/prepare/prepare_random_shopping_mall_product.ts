import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product(
  input?: DeepPartial<IShoppingMallProduct.ICreate> | undefined,
): IShoppingMallProduct.ICreate {
  // Helper to generate price with exactly 2 decimal places
  const generatePrice = () => {
    const integerPart = typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000000>
    >();
    const fractionalPart = typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<99>
    >();
    return parseFloat((integerPart + fractionalPart / 100).toFixed(2));
  };
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 8,
        wordMin: 4,
        wordMax: 10,
      }),
    shopping_mall_category_id:
      input?.shopping_mall_category_id ??
      typia.random<string & tags.Format<"uuid">>(),
    base_price: input?.base_price ?? generatePrice(),
    images: input?.images
      ? input.images.map((img) => ({
          image_url:
            img.image_url ??
            RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 5,
              wordMax: 15,
            }),
          sort_order:
            img.sort_order ??
            typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            image_url: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 5,
              wordMax: 15,
            }),
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
          }),
        ),
    variants: input?.variants
      ? input.variants.map((variant) => ({
          sku_code: variant.sku_code ?? RandomGenerator.alphaNumeric(10),
          option_values: variant.option_values
            ? variant.option_values.map((opt) => ({
                option_name:
                  opt.option_name ??
                  RandomGenerator.pick([
                    "color",
                    "size",
                    "material",
                    "style",
                  ] as const),
                option_value: opt.option_value ?? RandomGenerator.alphabets(4),
              }))
            : ArrayUtil.repeat(
                typia.random<
                  number &
                    tags.Type<"uint32"> &
                    tags.Minimum<1> &
                    tags.Maximum<3>
                >(),
                () => ({
                  option_name: RandomGenerator.pick([
                    "color",
                    "size",
                    "material",
                    "style",
                  ] as const),
                  option_value: RandomGenerator.alphabets(4),
                }),
              ),
          price_override: variant.price_override ?? null,
          stock_quantity:
            variant.stock_quantity ??
            typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
            >(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            sku_code: RandomGenerator.alphaNumeric(10),
            option_values: ArrayUtil.repeat(
              typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
              >(),
              () => ({
                option_name: RandomGenerator.pick([
                  "color",
                  "size",
                  "material",
                  "style",
                ] as const),
                option_value: RandomGenerator.alphabets(4),
              }),
            ),
            price_override: null,
            stock_quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
            >(),
          }),
        ),
  };
}
