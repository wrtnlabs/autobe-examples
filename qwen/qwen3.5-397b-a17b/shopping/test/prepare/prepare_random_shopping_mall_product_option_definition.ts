import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_option_definition(
  input?: DeepPartial<IShoppingMallProductOptionDefinition.ICreate>,
): IShoppingMallProductOptionDefinition.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(1),
  };
}
