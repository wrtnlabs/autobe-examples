import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfigurationValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_system_configuration_value(
  input?: DeepPartial<IShoppingMallSystemConfigurationValue.ICreate>,
): IShoppingMallSystemConfigurationValue.ICreate {
  return {
    configuration_id:
      input?.configuration_id ?? typia.random<string & tags.Format<"uuid">>(),
    configuration_name:
      input?.configuration_name ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    seller_id:
      input?.seller_id ??
      (Math.random() < 0.5
        ? null
        : typia.random<string & tags.Format<"uuid">>()),
  };
}
