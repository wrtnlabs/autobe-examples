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
    base_price: input?.base_price ?? typia.random<number & tags.Minimum<0>>(),
    category_id:
      input?.category_id ?? typia.random<string & tags.Format<"uuid">>(),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 5 }),
  };
}
