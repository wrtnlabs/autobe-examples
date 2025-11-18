import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_setting_update_toggle_enabled_flag(
  connection: api.IConnection,
) {
  // 1. Authenticate as an admin via /auth/adminUser/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create a disabled system setting with a stable key
  const settingKey = "experimental_feature_x";

  const createBody = {
    key: settingKey,
    value: "false",
    type: "boolean",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "experimental",
    enabled: false,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppSystemSetting>(createdSetting);

  // Sanity checks on initial state
  TestValidator.equals(
    "created system setting key matches input",
    createdSetting.key,
    settingKey,
  );
  TestValidator.equals(
    "created system setting enabled is false",
    createdSetting.enabled,
    false,
  );

  // 3. Toggle enabled flag to true via PUT /systemSettings/{settingKey}
  const updateBody = {
    enabled: true,
  } satisfies ITodoAppSystemSetting.IUpdate;

  const updatedSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.update(connection, {
      settingKey,
      body: updateBody,
    });
  typia.assert<ITodoAppSystemSetting>(updatedSetting);

  // 4. Invariant checks: id and key unchanged
  TestValidator.equals(
    "system setting id remains unchanged after toggle",
    updatedSetting.id,
    createdSetting.id,
  );
  TestValidator.equals(
    "system setting key remains unchanged after toggle",
    updatedSetting.key,
    createdSetting.key,
  );

  // 5. Invariant checks: value and type unchanged
  TestValidator.equals(
    "system setting value remains unchanged after toggle",
    updatedSetting.value,
    createdSetting.value,
  );
  TestValidator.equals(
    "system setting type remains unchanged after toggle",
    updatedSetting.type,
    createdSetting.type,
  );

  // 6. Optional fields: description and group unchanged (normalize to null)
  TestValidator.equals(
    "system setting description remains unchanged after toggle",
    updatedSetting.description ?? null,
    createdSetting.description ?? null,
  );
  TestValidator.equals(
    "system setting group remains unchanged after toggle",
    updatedSetting.group ?? null,
    createdSetting.group ?? null,
  );

  // 7. Enabled flag toggled from false to true
  TestValidator.equals(
    "updated system setting enabled is true",
    updatedSetting.enabled,
    true,
  );

  // 8. Timestamp behavior: created_at stable, updated_at advanced or equal
  TestValidator.equals(
    "created_at stays the same after toggle",
    updatedSetting.created_at,
    createdSetting.created_at,
  );

  const createdUpdatedAtMs = new Date(createdSetting.updated_at).getTime();
  const updatedUpdatedAtMs = new Date(updatedSetting.updated_at).getTime();

  TestValidator.predicate(
    "updated_at is refreshed to same or later timestamp after toggle",
    updatedUpdatedAtMs >= createdUpdatedAtMs,
  );

  // 9. Soft delete behavior: deleted_at should remain null/undefined
  TestValidator.equals(
    "deleted_at remains null after toggle (no soft delete)",
    updatedSetting.deleted_at ?? null,
    null,
  );
}
