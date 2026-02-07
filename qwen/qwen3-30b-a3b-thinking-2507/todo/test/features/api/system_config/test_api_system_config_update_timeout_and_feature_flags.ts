import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoSystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_config_update_timeout_and_feature_flags(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Get a random system config ID
  const configId = typia.random<string & tags.Format<"uuid">>();
  // Update system configuration
  const response = await api.functional.todo.system_configs.update(
    adminConnection,
    {
      configId,
      body: {
        password_reset_timeout: 120,
        feature_flags: JSON.stringify({ notification_preferences: true }),
      } satisfies ITodoSystemConfig.IUpdate,
    },
  );
  typia.assert(response);
  // Verify password reset timeout is 120
  TestValidator.equals(
    "password reset timeout",
    response.password_reset_timeout,
    120,
  );
  // Verify notification_preferences is enabled
  const featureFlags = JSON.parse(response.feature_flags);
  TestValidator.equals(
    "notification_preferences enabled",
    featureFlags.notification_preferences,
    true,
  );
}
