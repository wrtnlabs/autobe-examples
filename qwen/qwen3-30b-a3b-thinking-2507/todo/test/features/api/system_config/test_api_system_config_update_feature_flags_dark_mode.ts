import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoSystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_config_update_feature_flags_dark_mode(
  connection: api.IConnection,
): Promise<void> {
  const configId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    feature_flags: JSON.stringify({ dark_mode: true }),
  } satisfies ITodoSystemConfig.IUpdate;
  const updatedConfig = await api.functional.todo.system_configs.update(
    connection,
    {
      configId,
      body,
    },
  );
  typia.assert(updatedConfig);
  TestValidator.equals(
    "dark_mode should be enabled",
    updatedConfig.feature_flags,
    JSON.stringify({ dark_mode: true }),
  );
}
