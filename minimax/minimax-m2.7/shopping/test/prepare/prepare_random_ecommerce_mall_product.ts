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
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 2 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    categoryId:
      input?.categoryId ?? typia.random<string & tags.Format<"uuid">>(),
    basePrice:
      input?.basePrice ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<999999>
      >(),
  };
}
