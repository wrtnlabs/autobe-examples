import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
export function prepare_random_shopping_mall_product_attribute(
  input?: DeepPartial<IShoppingMallProductAttribute.ICreate>,
): IShoppingMallProductAttribute.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 1, wordMax: 3 }),
    value:
      input?.value ??
      (typia.random<boolean>()
        ? (RandomGenerator.paragraph({ sentences: 1, wordMin: 1, wordMax: 10 }) satisfies string & tags.MinLength<1> & tags.MaxLength<500>)
        : undefined),
  };
}