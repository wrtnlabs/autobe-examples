import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_setting_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the operation
  const operationConnection: api.IConnection = { host: connection.host };
  // Update system setting with minimal valid request (empty body since DTO has no properties)
  const updatedSetting =
    await api.functional.todoApp.system_settings.updateSystemSettings(
      operationConnection,
      {
        body: {} satisfies ITodoAppSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedSetting);
  // Validate the response structure (no properties to check since DTO is empty)
  // The fact that typia.assert succeeded validates the response format
}
