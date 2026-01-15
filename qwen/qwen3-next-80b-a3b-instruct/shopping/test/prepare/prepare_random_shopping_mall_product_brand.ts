import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBrand";
export function prepare_random_shopping_mall_product_brand(
  input?: DeepPartial<IShoppingMallProductBrand.ICreate>,
): IShoppingMallProductBrand.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
  };
}
