import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_product(
  input?: DeepPartial<IEcommerceMallProduct.ICreate> | undefined,
): IEcommerceMallProduct.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 3,
        wordMax: 7,
      }),
    base_price:
      input?.base_price ??
      typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>(),
    is_available: input?.is_available ?? true,
    category_id:
      input?.category_id ?? typia.random<string & tags.Format<"uuid">>(),
    images: input?.images
      ? input.images.map((image) => ({
          files: image.files ?? ["https://example.com/image.jpg"],
        }))
      : ArrayUtil.repeat(1, () => ({
          files: ["https://example.com/image.jpg"],
        })),
    variants: input?.variants
      ? input.variants.map((variant) => ({
          sku_code: variant.sku_code ?? RandomGenerator.alphaNumeric(8),
          price_override: variant.price_override ?? null,
        }))
      : ArrayUtil.repeat(2, () => ({
          sku_code: RandomGenerator.alphaNumeric(8),
          price_override: null,
        })),
  };
}
