import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_setting_update_success_by_admin_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/settings",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Seed an initial system setting the admin will update later
  const initialKey = "max_active_todos_per_user";
  const createBody = {
    key: initialKey,
    value: "100",
    type: "int",
    description:
      "Maximum number of active todos allowed per user before blocking new creations.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert(createdSetting);

  // Basic invariants on created setting
  TestValidator.equals(
    "created setting key should match request body key",
    createdSetting.key,
    createBody.key,
  );
  TestValidator.equals(
    "created setting value should match request body value",
    createdSetting.value,
    createBody.value,
  );
  TestValidator.equals(
    "created setting type should match request body type",
    createdSetting.type,
    createBody.type,
  );
  TestValidator.equals(
    "created setting description should match request body description",
    createdSetting.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "created setting group should match request body group",
    createdSetting.group ?? null,
    createBody.group ?? null,
  );
  TestValidator.equals(
    "created setting enabled should match request body enabled",
    createdSetting.enabled,
    createBody.enabled,
  );
  TestValidator.equals(
    "created setting deleted_at should be null or undefined",
    createdSetting.deleted_at ?? null,
    null,
  );

  // 3. Update the existing system setting using its key
  const updateBody = {
    value: "500",
    type: "int",
    description:
      "Updated maximum number of active todos allowed per user in the system.",
    group: "limits-updated",
    enabled: false,
  } satisfies ITodoAppSystemSetting.IUpdate;

  const updatedSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.update(connection, {
      settingKey: createdSetting.key,
      body: updateBody,
    });
  typia.assert(updatedSetting);

  // 4. Validate identity invariants: id and key must not change
  TestValidator.equals(
    "updated setting id must remain identical to created setting id",
    updatedSetting.id,
    createdSetting.id,
  );
  TestValidator.equals(
    "updated setting key must remain identical to created setting key",
    updatedSetting.key,
    createdSetting.key,
  );

  // 5. Validate that mutable fields were updated according to updateBody
  TestValidator.equals(
    "updated setting value should match update body value",
    updatedSetting.value,
    updateBody.value,
  );
  TestValidator.equals(
    "updated setting type should match update body type",
    updatedSetting.type,
    updateBody.type ?? createdSetting.type,
  );
  TestValidator.equals(
    "updated setting description should match update body description",
    updatedSetting.description ?? null,
    updateBody.description ?? null,
  );
  TestValidator.equals(
    "updated setting group should match update body group",
    updatedSetting.group ?? null,
    updateBody.group ?? null,
  );
  TestValidator.equals(
    "updated setting enabled should match update body enabled",
    updatedSetting.enabled,
    updateBody.enabled ?? createdSetting.enabled,
  );

  // 6. Validate audit fields behavior
  TestValidator.notEquals(
    "updated_at should change after successful update",
    updatedSetting.updated_at,
    createdSetting.updated_at,
  );
  TestValidator.equals(
    "deleted_at should still be null or undefined after update",
    updatedSetting.deleted_at ?? null,
    null,
  );
}
