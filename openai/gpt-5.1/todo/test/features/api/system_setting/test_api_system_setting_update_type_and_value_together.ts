import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_setting_update_type_and_value_together(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain an authorized connection (token handled by SDK).
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/settings",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppAdminUser.IJoin;

  const authorizedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a baseline system setting with type="int" and value="100".
  const settingKey = "max_active_todos_per_user";

  const createBody = {
    key: settingKey,
    value: "100",
    type: "int",
    description: "Maximum number of active todos allowed per user",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert(createdSetting);

  TestValidator.equals(
    "created setting key should match input key",
    createdSetting.key,
    settingKey,
  );
  TestValidator.equals(
    "created setting type should be int",
    createdSetting.type,
    "int",
  );
  TestValidator.equals(
    "created setting value should be 100",
    createdSetting.value,
    "100",
  );

  // Capture original timestamps for later comparison.
  const originalUpdatedAt = createdSetting.updated_at;

  // 3. Update the setting: change type to "double" and value to "100.5".
  const updateBody = {
    value: "100.5",
    type: "double",
    description: createdSetting.description,
    group: createdSetting.group,
    enabled: createdSetting.enabled,
  } satisfies ITodoAppSystemSetting.IUpdate;

  const updatedSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.update(connection, {
      settingKey,
      body: updateBody,
    });
  typia.assert(updatedSetting);

  // 4. Validate that id and key are stable, and type/value have changed appropriately.
  TestValidator.equals(
    "id remains unchanged after update",
    updatedSetting.id,
    createdSetting.id,
  );
  TestValidator.equals(
    "key remains unchanged after update",
    updatedSetting.key,
    createdSetting.key,
  );
  TestValidator.equals(
    "type should be updated to double",
    updatedSetting.type,
    "double",
  );
  TestValidator.equals(
    "value should be updated to 100.5",
    updatedSetting.value,
    "100.5",
  );
  TestValidator.equals(
    "description should remain the same",
    updatedSetting.description,
    createdSetting.description ?? null,
  );
  TestValidator.equals(
    "group should remain the same",
    updatedSetting.group,
    createdSetting.group ?? null,
  );
  TestValidator.equals(
    "enabled flag should remain true",
    updatedSetting.enabled,
    createdSetting.enabled,
  );

  // Compare updated_at timestamps using Date objects to ensure it increased.
  const originalUpdatedDate = new Date(originalUpdatedAt);
  const newUpdatedDate = new Date(updatedSetting.updated_at);
  TestValidator.predicate(
    "updated_at should be more recent after update",
    newUpdatedDate.getTime() > originalUpdatedDate.getTime(),
  );

  // 5. Negative/business-rule case: attempt an incompatible type/value pair.
  //    We keep TypeScript types correct (value is still a string), but pick a
  //    value that should not be parseable as the given semantic type.
  await TestValidator.error(
    "updating with incompatible type/value pair should fail",
    async () => {
      const incompatibleBody = {
        value: "not_a_number",
        type: "int",
      } satisfies ITodoAppSystemSetting.IUpdate;

      await api.functional.todoApp.adminUser.systemSettings.update(connection, {
        settingKey,
        body: incompatibleBody,
      });
    },
  );
}
