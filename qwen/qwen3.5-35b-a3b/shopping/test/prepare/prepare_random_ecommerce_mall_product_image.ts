import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_product_image(
  input?: DeepPartial<IEcommerceMallProductImage.ICreate>,
): IEcommerceMallProductImage.ICreate {
  return {
    image_url:
      input?.image_url ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    display_order:
      input?.display_order ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    alt_text:
      input?.alt_text ??
      (typia.random<boolean>() ? RandomGenerator.alphabets(20) : null),
  };
}
