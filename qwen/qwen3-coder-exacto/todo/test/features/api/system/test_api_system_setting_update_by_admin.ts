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
export async function test_api_system_setting_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin user to access system settings endpoint
  const admin = await authorize_todo_user_join(connection, {
    body: {
      email: "admin@todoapp.com",
      password: "adminpassword123",
      href: "https://todo.wrtn.io/admin",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Create admin connection with authentication token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${admin.token.access}`,
    },
  };
  // 2. Create an initial system setting
  const initialSetting =
    await generate_random_todo_app_todo_user_system_settings_create(
      adminConnection,
      {
        body: {
          key: "maintenance_mode",
          value: "false",
        },
      },
    );
  // 3. Update the existing system setting with the same key
  const updatedSetting =
    await api.functional.todoApp.todoUser.system.settings.create(
      adminConnection,
      {
        body: {
          key: "maintenance_mode", // Same key as initial setting
          value: "true", // New value
        } satisfies ITodoAppSystemSetting.ICreate,
      },
    );
  typia.assert(updatedSetting);
  // 4. Verify the setting was updated correctly
  TestValidator.equals(
    "system setting key should remain the same",
    updatedSetting.key,
    initialSetting.key,
  );
  TestValidator.equals(
    "system setting value should be updated",
    updatedSetting.value,
    "true",
  );
  TestValidator.equals(
    "system setting id should remain the same",
    updatedSetting.id,
    initialSetting.id,
  );
  TestValidator.predicate(
    "system setting updated_at should be more recent than created_at",
    () => {
      const createdAt = new Date(initialSetting.created_at).getTime();
      const updatedAt = new Date(updatedSetting.updated_at).getTime();
      return updatedAt >= createdAt;
    },
  );
}
