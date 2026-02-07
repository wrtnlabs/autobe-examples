import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoSystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_config_feature_flags_toggling(
  connection: api.IConnection,
): Promise<void> {
  // Update system config
  const updatedConfig = await api.functional.todo.system_configs.index(
    connection,
    {
      body: {
        feature_flags: JSON.stringify({ todo_reminders: true }),
      },
    },
  );
  // Type assertion
  const safeConfig = typia.assert<ITodoSystemConfig>(updatedConfig);
  // Validation
  TestValidator.equals(
    "feature_flags should contain todo_reminders with value true",
    JSON.parse(safeConfig.feature_flags),
    { todo_reminders: true },
  );
}
