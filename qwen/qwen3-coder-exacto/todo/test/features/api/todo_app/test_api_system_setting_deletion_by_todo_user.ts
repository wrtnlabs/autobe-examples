import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { prepare_random_todo_app_system_setting } from "../../../prepare/prepare_random_todo_app_system_setting";
import { generate_random_todo_app_todo_user_system_settings_create } from "../../../generate/generate_random_todo_app_todo_user_system_settings_create";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
export async function test_api_system_setting_deletion_by_todo_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a todoUser to create system settings
  const todoUser = await authorize_todo_user_join(connection, {
    body: {
      email: "test@example.com",
      password: "password123",
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Create a new connection for the authenticated user
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${todoUser.token.access}`,
    },
  };
  // Step 2: Create a system setting
  const setting =
    await generate_random_todo_app_todo_user_system_settings_create(
      userConnection,
      {
        body: {
          key: "test-setting-key",
          value: { test: "value" },
        },
      },
    );
  // Step 3: Delete the created system setting
  await api.functional.todoApp.todoUser.system.settings.erase(userConnection, {
    settingId: setting.id,
  });
  // Verify that the setting is successfully deleted by attempting to delete it again
  // This should result in an error since the setting no longer exists
  await TestValidator.error(
    "deleting non-existent setting should fail",
    async () => {
      await api.functional.todoApp.todoUser.system.settings.erase(
        userConnection,
        {
          settingId: setting.id,
        },
      );
    },
  );
}
