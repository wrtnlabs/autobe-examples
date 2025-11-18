import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_system_setting_delete_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare admin and an initial system setting
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "Admin1234!";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    display_name: RandomGenerator.name(2),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const settingKeyBase = "e2e_delete_auth_setting";
  const settingKey = `${settingKeyBase}_${RandomGenerator.alphaNumeric(8)}`;

  const createSettingBody = {
    key: settingKey,
    value: "42",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: createSettingBody,
    });
  typia.assert(createdSetting);

  TestValidator.equals(
    "created setting key should match input key",
    createdSetting.key,
    settingKey,
  );
  TestValidator.predicate(
    "created setting should be enabled",
    createdSetting.enabled === true,
  );

  const loadedSetting1: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.at(connection, {
      settingKey,
    });
  typia.assert(loadedSetting1);
  TestValidator.equals(
    "loaded setting (initial) key should match",
    loadedSetting1.key,
    settingKey,
  );

  const initialIndexRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    key: settingKey,
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.IRequest;

  const initialIndexPage: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: initialIndexRequest,
    });
  typia.assert(initialIndexPage);

  TestValidator.predicate(
    "initial index should contain at least one matching setting",
    initialIndexPage.data.some(
      (s) => s.key === settingKey && s.enabled === true,
    ),
  );

  // 2. Attempt DELETE as unauthenticated guest (no Authorization header)
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated guest should be forbidden to delete system setting",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.erase(
        guestConnection,
        {
          settingKey,
        },
      );
    },
  );

  const loadedAfterGuest: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.at(connection, {
      settingKey,
    });
  typia.assert(loadedAfterGuest);

  TestValidator.equals(
    "setting key should remain unchanged after guest delete attempt",
    loadedAfterGuest.key,
    settingKey,
  );
  TestValidator.predicate(
    "setting should remain enabled after guest delete attempt",
    loadedAfterGuest.enabled === true,
  );

  const indexAfterGuestRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    key: settingKey,
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.IRequest;

  const indexAfterGuest: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: indexAfterGuestRequest,
    });
  typia.assert(indexAfterGuest);

  TestValidator.predicate(
    "index listing should still contain setting after guest attempt",
    indexAfterGuest.data.some(
      (s) => s.key === settingKey && s.enabled === true,
    ),
  );

  // 3. Create a member user and verify member flows
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "Member1234!";

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword as string & tags.Format<"password">,
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    href: "https://member.todo-app.test/join" as string & tags.Format<"uri">,
    referrer: "https://member.todo-app.test/landing" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: new Date().toISOString() as string & tags.Format<"date-time">,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo title should match input",
    createdTodo.title,
    todoCreateBody.title,
  );

  // 4. Attempt DELETE with member token
  await TestValidator.error(
    "member user should not be allowed to delete admin system settings",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.erase(connection, {
        settingKey,
      });
    },
  );

  // 5. Switch back to admin and verify setting is still present and enabled
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/dashboard",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminRelogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  const loadedAfterMember: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.at(connection, {
      settingKey,
    });
  typia.assert(loadedAfterMember);

  TestValidator.equals(
    "setting key should remain unchanged after member delete attempt",
    loadedAfterMember.key,
    settingKey,
  );
  TestValidator.predicate(
    "setting should remain enabled after member delete attempt",
    loadedAfterMember.enabled === true,
  );

  const indexAfterMemberRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    key: settingKey,
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.IRequest;

  const indexAfterMember: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: indexAfterMemberRequest,
    });
  typia.assert(indexAfterMember);

  TestValidator.predicate(
    "index listing should still contain setting after member attempt",
    indexAfterMember.data.some(
      (s) => s.key === settingKey && s.enabled === true,
    ),
  );
}
