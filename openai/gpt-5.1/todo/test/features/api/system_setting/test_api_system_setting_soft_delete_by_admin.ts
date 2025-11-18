import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate that an authenticated admin user can soft delete a global system
 * setting by its business key, and that the setting behaves as logically
 * deleted afterwards.
 *
 * Business flow under test:
 *
 * 1. Admin registration and authentication using /auth/adminUser/join.
 * 2. System setting creation with a unique business key via POST
 *    /todoApp/adminUser/systemSettings.
 * 3. Verification that the setting is retrievable via GET
 *    /todoApp/adminUser/systemSettings/{settingKey}.
 * 4. Logical deletion using DELETE /todoApp/adminUser/systemSettings/{settingKey}
 *    with the same key.
 * 5. Post-deletion verification that:
 *
 *    - GET by key now results in an HTTP error (not-found semantics).
 *    - Listing active settings via PATCH /todoApp/adminUser/systemSettings no longer
 *         includes the deleted key.
 * 6. Error path checks:
 *
 *    - Deleting a non-existent key yields a not-found style HTTP error.
 *    - Using an unauthenticated connection to delete a setting fails with an HTTP
 *         error.
 */
export async function test_api_system_setting_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user to obtain an authenticated admin context.
  const joinBody = {
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
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create a concrete system setting with a unique business key.
  const settingKey = `max_active_todos_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    key: settingKey,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const created: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppSystemSetting>(created);

  TestValidator.equals(
    "created setting key must match request key",
    created.key,
    settingKey,
  );
  TestValidator.equals(
    "created setting should be enabled",
    created.enabled,
    true,
  );

  // 3. Verify the setting is retrievable by its business key via GET /systemSettings/{settingKey}.
  const fetched: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.at(connection, {
      settingKey,
    });
  typia.assert<ITodoAppSystemSetting>(fetched);

  TestValidator.equals(
    "fetched setting id must match created id",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "fetched setting key must match created key",
    fetched.key,
    created.key,
  );

  // 4. Optionally, confirm the setting appears in a listing of enabled settings.
  const listBefore: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: {
        page: 1,
        pageSize: 50,
        key: settingKey,
        group: undefined,
        enabled: true,
        createdFrom: undefined,
        createdTo: undefined,
        updatedFrom: undefined,
        updatedTo: undefined,
        sortBy: "key",
        sortDirection: "asc",
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert<IPageITodoAppSystemSetting.ISummary>(listBefore);

  TestValidator.predicate(
    "listing before delete should contain the created setting key",
    () =>
      listBefore.data.some((row) => {
        return row.key === settingKey;
      }),
  );

  // 5. Perform the soft delete using DELETE /systemSettings/{settingKey}.
  await api.functional.todoApp.adminUser.systemSettings.erase(connection, {
    settingKey,
  });

  // 6. After deletion, GET by the same key should result in a not-found style HttpError.
  await TestValidator.httpError(
    "GET after delete should respond with client error (not found)",
    [400, 404, 410],
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.at(connection, {
        settingKey,
      });
    },
  );

  // 7. Listing enabled settings should no longer include the deleted key.
  const listAfter: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: {
        page: 1,
        pageSize: 50,
        key: settingKey,
        group: undefined,
        enabled: true,
        createdFrom: undefined,
        createdTo: undefined,
        updatedFrom: undefined,
        updatedTo: undefined,
        sortBy: "key",
        sortDirection: "asc",
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert<IPageITodoAppSystemSetting.ISummary>(listAfter);

  TestValidator.predicate(
    "listing after delete should not contain the deleted setting key",
    () => listAfter.data.every((row) => row.key !== settingKey),
  );

  // 8. Deleting a non-existent key should yield a not-found style HTTP error.
  const nonExistentKey = `nonexistent_${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.httpError(
    "deleting non-existent system setting should fail with client error",
    [400, 404, 410],
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.erase(connection, {
        settingKey: nonExistentKey,
      });
    },
  );

  // 9. Attempt soft delete without authentication should fail.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "unauthenticated adminUser erase should be rejected",
    [401, 403],
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.erase(
        unauthenticatedConnection,
        {
          settingKey,
        },
      );
    },
  );
}
