import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_system_configuration(
  input?: DeepPartial<IShoppingMallSystemConfiguration.ICreate>,
): IShoppingMallSystemConfiguration.ICreate {
  return {
    config_key: input?.config_key ?? RandomGenerator.alphaNumeric(8),
    category: input?.category ?? null,
    is_enabled:
      input?.is_enabled ?? RandomGenerator.pick([true, false] as const),
    description: input?.description ?? null,
    updated_by:
      input?.updated_by ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
