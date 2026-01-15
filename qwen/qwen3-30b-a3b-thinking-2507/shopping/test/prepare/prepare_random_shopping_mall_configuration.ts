import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
export function prepare_random_shopping_mall_configuration(
  input?: DeepPartial<IShoppingMallConfiguration.ICreate>,
): IShoppingMallConfiguration.ICreate {
  return {
    key: typia.random<string & tags.Pattern<"[a-zA-Z0-9_]+">>(),
    value: RandomGenerator.paragraph({ sentences: 1 }),
  };
}
