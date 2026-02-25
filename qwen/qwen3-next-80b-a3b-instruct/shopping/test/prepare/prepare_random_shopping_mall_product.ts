import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product(
  input?: DeepPartial<IShoppingMallProduct.ICreate>,
): IShoppingMallProduct.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 1 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    category_id:
      input?.category_id ?? typia.random<string & tags.Format<"uuid">>(),
    base_price:
      input?.base_price ??
      typia.random<number & tags.Minimum<0.01> & tags.Maximum<10000>>(),
    images: input?.images
      ? input.images.map((url) => url)
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<15>
          >(),
          () => RandomGenerator.alphaNumeric(12) + ".jpg",
        ),
    variants: input?.variants
      ? input.variants.map((variant) => ({
          sku_code:
            variant.sku_code ??
            RandomGenerator.alphaNumeric(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<3> &
                  tags.Maximum<20>
              >(),
            ),
          price:
            variant.price === undefined
              ? typia.random<number>() > 0.5
                ? typia.random<
                    number & tags.Minimum<0> & tags.Maximum<9999.99>
                  >()
                : null
              : variant.price,
          options: (variant.options ?? []).map((option) => ({
            option_name: option.option_name ?? RandomGenerator.name(1),
            option_value: option.option_value ?? RandomGenerator.name(1),
          })),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<20>
          >(),
          () => ({
            sku_code: RandomGenerator.alphaNumeric(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<3> &
                  tags.Maximum<20>
              >(),
            ),
            price:
              typia.random<number>() > 0.5
                ? typia.random<
                    number & tags.Minimum<0> & tags.Maximum<9999.99>
                  >()
                : null,
            options: ArrayUtil.repeat(
              typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
              >(),
              () => ({
                option_name: RandomGenerator.name(1),
                option_value: RandomGenerator.name(1),
              }),
            ),
          }),
        ),
  };
}