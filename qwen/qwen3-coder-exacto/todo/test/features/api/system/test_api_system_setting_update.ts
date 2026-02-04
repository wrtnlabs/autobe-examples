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
export async function test_api_system_setting_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a todo user to access the system
  const todoUser = await authorize_todo_user_join(connection, {});
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_todo_user_login(userConnection, {
    body: {
      email: todoUser.email,
      password: "password123",
      href: "https://todo.wrtn.io/login",
      referrer: "https://todo.wrtn.io",
    },
  });
  // 2. Create a system setting which we'll subsequently update
  const setting =
    await generate_random_todo_app_todo_user_system_settings_create(
      userConnection,
      {
        body: {
          key: "test.setting.key",
          value: "initial_value",
        },
      },
    );
  // 3. Perform the update operation with a new value for the setting
  const newValue = "updated_value";
  const updatedSetting =
    await api.functional.todoApp.todoUser.system.settings.update(
      userConnection,
      {
        settingId: setting.id,
        body: {
          value: newValue,
        },
      },
    );
  // 4. Verify that the update is successful and the new value is reflected in the response
  typia.assert(updatedSetting);
  TestValidator.equals("setting value updated", updatedSetting.value, newValue);
  TestValidator.equals(
    "setting key unchanged",
    updatedSetting.key,
    setting.key,
  );
  TestValidator.predicate(
    "updated_at timestamp should be more recent than created_at",
    () =>
      new Date(updatedSetting.updated_at).getTime() >=
      new Date(setting.created_at).getTime(),
  );
}
