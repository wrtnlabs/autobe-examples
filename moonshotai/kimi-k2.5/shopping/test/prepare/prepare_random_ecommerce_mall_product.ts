import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_product(
  input?: DeepPartial<IEcommerceMallProduct.ICreate>,
): IEcommerceMallProduct.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    categoryId:
      input?.categoryId ?? typia.random<string & tags.Format<"uuid">>(),
    basePrice:
      input?.basePrice ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000000>
      >(),
    images: input?.images
      ? input.images.map((img) => ({
          imageUrl:
            img?.imageUrl ??
            `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
          }),
        ),
  };
}
