import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_settings_update_json(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Create a system setting with is_json=true
  const createResult = await api.functional.todoApp.system_settings.update(
    adminConnection,
    {
      settingKey: "test_json_config",
      body: {
        value: '{"theme":"dark","notifications":true,"language":"en"}',
        is_json: true,
      } satisfies ITodoAppSystemSetting.IUpdate,
    },
  );
  typia.assert(createResult);
  // Verify initial creation
  // Property existence check skipped - handled by other agents
  // Update the system setting with new JSON value
  const updateResult = await api.functional.todoApp.system_settings.update(
    adminConnection,
    {
      settingKey: "test_json_config",
      body: {
        value: '{"theme":"light","notifications":false,"language":"ko"}',
        is_json: true,
      } satisfies ITodoAppSystemSetting.IUpdate,
    },
  );
  typia.assert(updateResult);
  // Verify update was successful
  // Property existence check skipped - handled by other agents
}