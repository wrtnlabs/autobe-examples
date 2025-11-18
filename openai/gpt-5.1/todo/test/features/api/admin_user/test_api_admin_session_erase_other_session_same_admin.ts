import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_admin_session_erase_other_session_same_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user and obtain authorized context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const joinedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(joinedAdmin);

  // 2. Create an initial system setting to prove the admin token works
  const firstSettingBody = {
    key: `max_active_todos_${RandomGenerator.alphabets(6)}`,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const firstSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: firstSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(firstSetting);

  // 3. Call the session erase endpoint for a random target session of this admin
  const targetSessionId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.todoApp.adminUser.adminUsers.sessions.erase(connection, {
    adminUserId: joinedAdmin.id,
    sessionId: targetSessionId,
  });

  // 4. After erase, ensure the current admin token can still perform admin actions
  const secondSettingBody = {
    key: `feature_flag_${RandomGenerator.alphabets(6)}`,
    value: "true",
    type: "boolean",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    group: "features",
    enabled: firstSetting.enabled,
  } satisfies ITodoAppSystemSetting.ICreate;

  const secondSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: secondSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(secondSetting);

  // 5. Basic logical validations on the created settings
  TestValidator.predicate(
    "system setting keys should differ between first and second creation",
    firstSetting.key !== secondSetting.key,
  );
  TestValidator.equals(
    "enabled flags of both settings should match",
    firstSetting.enabled,
    secondSetting.enabled,
  );
}
