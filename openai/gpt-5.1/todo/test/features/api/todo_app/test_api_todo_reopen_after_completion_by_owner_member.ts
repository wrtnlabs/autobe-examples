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

export async function test_api_todo_reopen_after_completion_by_owner_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins (register admin account and obtain admin auth context)
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

  const adminJoinOutput: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminJoinOutput);

  // 2. Admin login to re-establish admin context (optional but explicit)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLoginOutput: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminLoginOutput);

  // 3. Admin creates a system setting to allow many active todos per user
  const settingKey = "max_active_todos_per_user";
  const systemSettingBody = {
    key: settingKey,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(systemSetting);

  TestValidator.equals(
    "system setting key should match",
    systemSetting.key,
    settingKey,
  );
  TestValidator.predicate(
    "system setting should be enabled",
    systemSetting.enabled === true,
  );

  // 4. Member joins (registers a new member user)
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
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberJoinOutput: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberJoinOutput);

  TestValidator.equals(
    "joined member email should match",
    memberJoinOutput.email,
    memberEmail,
  );

  // 5. Member logs in explicitly to ensure member context
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberLoginOutput: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberLoginOutput);

  TestValidator.equals(
    "logged-in member email should match",
    memberLoginOutput.email,
    memberEmail,
  );

  // 6. Member creates an active todo with a future due date
  const initialState = "active";
  const futureDueDate: string & tags.Format<"date-time"> = RandomGenerator.date(
    new Date(),
    7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    due_date: futureDueDate,
    state: initialState,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  TestValidator.equals(
    "created todo should be owned by joined member",
    createdTodo.memberUser.email,
    memberEmail,
  );
  TestValidator.equals(
    "created todo state should be initial active state",
    createdTodo.state,
    initialState,
  );
  TestValidator.predicate(
    "created todo should not be completed",
    createdTodo.completed_at === null || createdTodo.completed_at === undefined,
  );
  TestValidator.predicate(
    "created todo should not be deleted",
    createdTodo.deleted_at === null || createdTodo.deleted_at === undefined,
  );

  const createdUpdatedAt = new Date(createdTodo.updated_at).getTime();

  // 7. Member completes the todo
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(completedTodo);

  TestValidator.equals(
    "completed todo id should match original",
    completedTodo.id,
    createdTodo.id,
  );
  TestValidator.notEquals(
    "completed todo state should differ from initial active state",
    completedTodo.state,
    initialState,
  );
  TestValidator.predicate(
    "completed todo should have completed_at set",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  const completedUpdatedAt = new Date(completedTodo.updated_at).getTime();
  TestValidator.predicate(
    "completed todo updated_at should be >= created updated_at",
    completedUpdatedAt >= createdUpdatedAt,
  );

  // 8. Member reopens the completed todo
  const reopenedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.reopen(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(reopenedTodo);

  TestValidator.equals(
    "reopened todo id should match original",
    reopenedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "reopened todo state should return to initial active state",
    reopenedTodo.state,
    initialState,
  );
  TestValidator.notEquals(
    "reopened todo state should differ from completed state",
    reopenedTodo.state,
    completedTodo.state,
  );
  TestValidator.predicate(
    "reopened todo should have completed_at cleared",
    reopenedTodo.completed_at === null ||
      reopenedTodo.completed_at === undefined,
  );
  TestValidator.predicate(
    "reopened todo should not be deleted",
    reopenedTodo.deleted_at === null || reopenedTodo.deleted_at === undefined,
  );

  const reopenedUpdatedAt = new Date(reopenedTodo.updated_at).getTime();
  TestValidator.predicate(
    "reopened todo updated_at should be greater than completed updated_at",
    reopenedUpdatedAt > completedUpdatedAt,
  );
}
