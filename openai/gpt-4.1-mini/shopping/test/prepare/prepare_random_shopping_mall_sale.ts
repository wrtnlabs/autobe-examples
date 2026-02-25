import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_sale(
  input?: DeepPartial<IShoppingMallSale.ICreate>,
): IShoppingMallSale.ICreate {
  return {
    category_id:
      input?.category_id ?? typia.random<string & tags.Format<"uuid">>(),
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    base_price:
      input?.base_price ??
      typia.random<number & tags.Type<"double"> & tags.Minimum<0>>(),
  };
}
