import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_todo_completion_state_transition_rules(
  connection: api.IConnection,
) {
  // 1. Admin setup: join, login, configure a system setting controlling todo behavior
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorizedByJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedByJoin);

  // Explicit admin login to exercise dependency and confirm token issuance
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedByLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedByLogin);

  TestValidator.equals(
    "admin join/login should reference same admin email",
    adminAuthorizedByLogin.email,
    adminAuthorizedByJoin.email,
  );

  // Create a system setting that conceptually may affect todo transitions
  const systemSettingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  TestValidator.equals(
    "system setting key should match",
    systemSetting.key,
    systemSettingBody.key,
  );

  // 2. Member user setup: join and login
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorizedByJoin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedByJoin);

  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAuthorizedByLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedByLogin);

  TestValidator.equals(
    "member join/login should reference same member email",
    memberAuthorizedByLogin.email,
    memberAuthorizedByJoin.email,
  );

  // 3. Create todos in different initial states
  const activeTodoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const activeTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: activeTodoCreateBody,
    });
  typia.assert(activeTodo);

  TestValidator.equals(
    "newly created active todo should have requested state",
    activeTodo.state,
    activeTodoCreateBody.state,
  );

  const incompatibleTodoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: null,
    state: "archived",
  } satisfies ITodoAppTodo.ICreate;

  const incompatibleTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: incompatibleTodoCreateBody,
    });
  typia.assert(incompatibleTodo);

  TestValidator.equals(
    "newly created incompatible todo should have requested state",
    incompatibleTodo.state,
    incompatibleTodoCreateBody.state,
  );

  // 4. Valid completion: active todo should transition to completed
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: activeTodo.id,
    });
  typia.assert(completedTodo);

  TestValidator.equals(
    "completed todo should keep same id",
    completedTodo.id,
    activeTodo.id,
  );

  TestValidator.predicate(
    "completed todo should have non-null completed_at",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  TestValidator.equals<ITodoAppMemberUser.ISummary | null | undefined>(
    "completed todo should still belong to same member user",
    completedTodo.memberUser,
    activeTodo.memberUser,
  );

  // 5. Invalid completion: incompatible state should be rejected
  await TestValidator.error(
    "completing todo in incompatible state should fail",
    async () => {
      await api.functional.todoApp.memberUser.todos.complete(connection, {
        todoId: incompatibleTodo.id,
      });
    },
  );
}
