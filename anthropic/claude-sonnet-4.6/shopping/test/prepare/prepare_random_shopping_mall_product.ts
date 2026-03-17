import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product(
  input?: DeepPartial<IShoppingMallProduct.ICreate> | undefined,
): IShoppingMallProduct.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(3),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    base_price:
      input?.base_price ??
      typia.random<number & tags.Type<"double"> & tags.ExclusiveMinimum<0>>(),
    categoryId:
      input?.categoryId ?? typia.random<string & tags.Format<"uuid">>(),
    images: input?.images
      ? input.images.map((img) => ({
          urls: img?.urls
            ? img.urls.map(
                (u) => u ?? typia.random<string & tags.Format<"url">>(),
              )
            : ArrayUtil.repeat(
                typia.random<
                  number &
                    tags.Type<"uint32"> &
                    tags.Minimum<1> &
                    tags.Maximum<3>
                >(),
                () => typia.random<string & tags.Format<"url">>(),
              ),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            urls: ArrayUtil.repeat(
              typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
              >(),
              () => typia.random<string & tags.Format<"url">>(),
            ),
          }),
        ),
    variants: input?.variants
      ? input.variants.map((variant) => ({
          sku: variant?.sku ?? RandomGenerator.alphaNumeric(10),
          priceOverride: variant?.priceOverride ?? null,
          options: variant?.options
            ? variant.options.map((opt) => ({
                id: opt?.id ?? typia.random<string & tags.Format<"uuid">>(),
                product_variant_id:
                  opt?.product_variant_id ??
                  typia.random<string & tags.Format<"uuid">>(),
                key:
                  opt?.key ??
                  RandomGenerator.pick([
                    "color",
                    "size",
                    "material",
                    "style",
                  ] as const),
                value: opt?.value ?? RandomGenerator.alphabets(6),
                sequence:
                  opt?.sequence ?? typia.random<number & tags.Type<"int32">>(),
                created_at:
                  opt?.created_at ??
                  typia.random<string & tags.Format<"date-time">>(),
              }))
            : ArrayUtil.repeat(
                typia.random<
                  number &
                    tags.Type<"uint32"> &
                    tags.Minimum<1> &
                    tags.Maximum<2>
                >(),
                (index) => ({
                  id: typia.random<string & tags.Format<"uuid">>(),
                  product_variant_id: typia.random<
                    string & tags.Format<"uuid">
                  >(),
                  key: RandomGenerator.pick([
                    "color",
                    "size",
                    "material",
                    "style",
                  ] as const),
                  value: RandomGenerator.alphabets(6),
                  sequence: index,
                  created_at: typia.random<string & tags.Format<"date-time">>(),
                }),
              ),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
          >(),
          () => ({
            sku: RandomGenerator.alphaNumeric(10),
            priceOverride: null,
            options: ArrayUtil.repeat(
              typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
              >(),
              (index) => ({
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: RandomGenerator.pick([
                  "color",
                  "size",
                  "material",
                  "style",
                ] as const),
                value: RandomGenerator.alphabets(6),
                sequence: index,
                created_at: typia.random<string & tags.Format<"date-time">>(),
              }),
            ),
          }),
        ),
  };
}
