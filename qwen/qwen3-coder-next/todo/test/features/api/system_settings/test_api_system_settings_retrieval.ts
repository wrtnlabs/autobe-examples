import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_settings_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Setup: Use a known setting key (assuming 'app.name' exists in test database)
  const settingKey = "app.name";
  // Test: Retrieve an existing system setting
  const setting = await api.functional.todoApp.system_settings.at(
    adminConnection,
    {
      settingKey: settingKey,
    },
  );
  typia.assert(setting);
  // Validate: The setting should be retrieved successfully
  // typia.assert above already validates the complete structure
  // Test: Try to retrieve a non-existent setting (should throw error)
  const nonExistentKey = `non_existent_${RandomGenerator.alphabets(8)}`;
  await TestValidator.error("non-existent key should throw error", async () => {
    await api.functional.todoApp.system_settings.at(adminConnection, {
      settingKey: nonExistentKey,
    });
  });
}
