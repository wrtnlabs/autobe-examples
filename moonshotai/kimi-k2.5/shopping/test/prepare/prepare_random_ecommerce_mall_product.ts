import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_product(
  input?: DeepPartial<IEcommerceMallProduct.ICreate>,
): IEcommerceMallProduct.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(3),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 3,
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 4,
        wordMax: 8,
      }),
    categoryId:
      input?.categoryId ?? typia.random<string & tags.Format<"uuid">>(),
    basePrice:
      input?.basePrice ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000000>
      >(),
  };
}
