import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigHistory";
export function prepare_random_shopping_mall_config_history(
  input?: DeepPartial<IShoppingMallConfigHistory.ICreate>,
): IShoppingMallConfigHistory.ICreate {
  return {
    configuration_id: typia.random<string & tags.Format<"uuid">>(),
    previous_value:
      input?.previous_value ??
      RandomGenerator.content({ paragraphs: 1, wordMin: 3, wordMax: 8 }),
    new_value:
      input?.new_value ??
      RandomGenerator.content({ paragraphs: 1, wordMin: 4, wordMax: 10 }),
  };
}
