import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_product(
  input?: DeepPartial<IEcommerceProduct.ICreate> | undefined,
): IEcommerceProduct.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    category_id:
      input?.category_id ?? typia.random<string & tags.Format<"uuid">>(),
    base_price:
      input?.base_price ?? typia.random<number & tags.Minimum<0.01>>(),
  };
}
