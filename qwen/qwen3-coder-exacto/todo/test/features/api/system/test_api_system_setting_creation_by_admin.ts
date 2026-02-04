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
export async function test_api_system_setting_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin user to access system settings endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_todo_user_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin_password_123",
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // 2. Create a system setting
  const settingKey = "max_todo_count";
  const settingValue = 1000;
  const createdSetting =
    await generate_random_todo_app_todo_user_system_settings_create(
      adminConnection,
      {
        body: {
          key: settingKey,
          value: String(settingValue),  // Convert to string
        },
      },
    );
  // 3. Validate the created setting
  typia.assert(createdSetting);
  TestValidator.equals(
    "setting key should match",
    createdSetting.key,
    settingKey,
  );
  TestValidator.equals(
    "setting value should match",
    createdSetting.value,
    String(settingValue),  // Convert to string
  );
  TestValidator.predicate(
    "setting should have an ID",
    () => createdSetting.id !== undefined,
  );
  TestValidator.predicate(
    "setting should have created_at timestamp",
    () => createdSetting.created_at !== undefined,
  );
  TestValidator.predicate(
    "setting should have updated_at timestamp",
    () => createdSetting.updated_at !== undefined,
  );
  TestValidator.predicate(
    "created_at and updated_at should be valid date-time strings",
    () => {
      return (
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
          createdSetting.created_at,
        ) &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
          createdSetting.updated_at,
        )
      );
    },
  );
  // 4. Test updating an existing setting (creating with same key should update)
  const updatedValue = 1500;
  const updatedSetting =
    await generate_random_todo_app_todo_user_system_settings_create(
      adminConnection,
      {
        body: {
          key: settingKey,
          value: String(updatedValue),  // Convert to string
        },
      },
    );
  // 5. Validate the updated setting
  typia.assert(updatedSetting);
  TestValidator.equals(
    "updated setting ID should match original",
    updatedSetting.id,
    createdSetting.id,
  );
  TestValidator.equals(
    "updated setting key should match",
    updatedSetting.key,
    settingKey,
  );
  TestValidator.equals(
    "updated setting value should match",
    updatedSetting.value,
    String(updatedValue),  // Convert to string
  );
  TestValidator.predicate(
    "updated_at should be same or later than created_at",
    () => {
      return (
        new Date(updatedSetting.updated_at).getTime() >=
        new Date(createdSetting.updated_at).getTime()
      );
    },
  );
}