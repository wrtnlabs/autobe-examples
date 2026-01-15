import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformConfiguration";
export async function test_api_platform_configuration_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const configKey = `feature.${RandomGenerator.alphabets(3)}.${RandomGenerator.alphabets(3)}.${RandomGenerator.alphaNumeric(4)}`;
  const config = await api.functional.shoppingMall.platform.configurations.at(
    connection,
    {
      configKey,
    },
  );
  typia.assert(config);
}
