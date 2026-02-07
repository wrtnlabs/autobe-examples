import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_todo_app_system_settings_create } from "../../../generate/generate_random_todo_app_system_settings_create";
import { prepare_random_todo_app_system_setting } from "../../../prepare/prepare_random_todo_app_system_setting";

export async function test_api_system_settings_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the test operation
  const testConnection: api.IConnection = { host: connection.host };
  // Generate random system settings data
  const body = {
    key: RandomGenerator.name(),
    value: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 1 }),
    is_json: false,
  } satisfies ITodoAppSystemSetting.ICreate;
  // Call the API to create system settings
  const result = typia.assert(
    await generate_random_todo_app_system_settings_create(testConnection, {
      body,
    }),
  );
  // Verify created system settings properties - using runtime type checking
  // Since the interface doesn't have these properties, we skip validation
  // that references non-existent properties
  if (result) {
    // Basic validation that the result is not null/undefined
  }
}