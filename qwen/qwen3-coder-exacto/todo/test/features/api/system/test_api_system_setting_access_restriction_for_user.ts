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
export async function test_api_system_setting_access_restriction_for_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a regular user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_todo_user_join(userConnection, {
    body: {
      email: "test-user@example.com",
      password: "password123",
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Step 2: Try to access the system settings endpoint as a regular user
  // This should fail with a 403 Forbidden error
  await TestValidator.httpError(
    "regular users should not be able to access system settings",
    403,
    async () => {
      await api.functional.todoApp.todoUser.system.settings.create(
        userConnection,
        {
          body: {
            key: "test-setting",
            value: "test-value",
          } satisfies ITodoAppSystemSetting.ICreate,
        },
      );
    },
  );
}
