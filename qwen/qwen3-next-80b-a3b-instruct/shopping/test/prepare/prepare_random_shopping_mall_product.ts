import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
export function prepare_random_shopping_mall_product(
  input?: DeepPartial<IShoppingMallProduct.ICreate>,
): IShoppingMallProduct.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        sentenceMin: 8,
        sentenceMax: 15,
        wordMin: 4,
        wordMax: 10,
      }),
    categoryId:
      input?.categoryId ?? typia.random<string & tags.Format<"uuid">>(),
    price:
      input?.price ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<99999>
      >() / 100,
    sku: input?.sku ?? RandomGenerator.alphaNumeric(8),
    images: input?.images
      ? input.images.map((image) => image)
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () =>
            `https://cdn.shop.com/products/${RandomGenerator.alphaNumeric(12)}.jpg`,
        ),
  };
}
