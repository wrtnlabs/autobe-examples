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

/**
 * Validate the basic completion flow of a member user's own todo.
 *
 * Business context:
 *
 * - System settings can gate todo behavior; admin must configure them first.
 * - Member users own personal todos and can complete their own active items.
 * - Completing a todo should update its state and completion timestamp while
 *   preserving identity and ownership.
 *
 * Steps:
 *
 * 1. As an admin, join and log in to obtain admin authorization.
 * 2. Create at least one system setting to simulate enabling todo completion.
 * 3. As a member user, join and log in to obtain member authorization.
 * 4. Create a new active todo for the member user.
 * 5. Call the completion endpoint for that todo as the owning member.
 * 6. Verify that the todo is returned with the same id and owner, a changed state
 *    representing completion, and a populated completed_at timestamp.
 * 7. Call the completion endpoint a second time to ensure the operation is
 *    stable/idempotent and invariants still hold.
 */
export async function test_api_todo_completion_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin joins (registration + implicit authentication)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "Admin#" + RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
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

  // 2. Admin logs in explicitly (exercise login; keeps Authorization as admin)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLoggedIn: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  TestValidator.equals(
    "admin id should be stable between join and login",
    adminLoggedIn.id,
    adminAuthorized.id,
  );

  // 3. Create a system setting that conceptually enables todo completion
  const systemSettingKey = "enable_todo_completion";
  const systemSettingBody = {
    key: systemSettingKey,
    value: "true",
    type: "boolean",
    description: "Flag to enable member todo completion actions in e2e tests.",
    group: "features",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  TestValidator.equals(
    "created system setting key matches request",
    systemSetting.key,
    systemSettingKey,
  );

  TestValidator.predicate(
    "system setting should be enabled",
    systemSetting.enabled === true,
  );

  // 4. Member user joins
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "Member#" + RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword as string & tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/member/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorizedOnJoin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedOnJoin);

  // 5. Member logs in explicitly to ensure member auth context
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://todo-app.test/member/login",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAuthorizedOnLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedOnLogin);

  TestValidator.equals(
    "member id should be stable between join and login",
    memberAuthorizedOnLogin.id,
    memberAuthorizedOnJoin.id,
  );

  const memberId: string & tags.Format<"uuid"> = memberAuthorizedOnLogin.id;

  // 6. Member creates an active todo
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 6 });
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const todoCreateBody = {
    title: todoTitle,
    description: todoDescription,
    due_date: dueDate,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  const createdTodoId = createdTodo.id;

  TestValidator.equals(
    "created todo id should match itself",
    createdTodo.id,
    createdTodoId,
  );

  TestValidator.equals(
    "created todo owner should be the logged-in member",
    createdTodo.memberUser.id,
    memberId,
  );

  TestValidator.equals(
    "created todo state should match requested initial state",
    createdTodo.state,
    todoCreateBody.state,
  );

  TestValidator.predicate(
    "newly created todo should not have completed_at set",
    createdTodo.completed_at === null || createdTodo.completed_at === undefined,
  );

  const initialState = createdTodo.state;
  const initialCompletedAt = createdTodo.completed_at ?? null;
  const initialUpdatedAt = createdTodo.updated_at;

  // 7. Complete the todo as the owning member
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: createdTodoId,
    });
  typia.assert(completedTodo);

  TestValidator.equals(
    "completed todo id should be identical to created todo id",
    completedTodo.id,
    createdTodoId,
  );

  TestValidator.equals(
    "completed todo owner should remain the same member",
    completedTodo.memberUser.id,
    memberId,
  );

  TestValidator.notEquals(
    "todo state should change after completion",
    completedTodo.state,
    initialState,
  );

  TestValidator.predicate(
    "completed todo state should be non-empty string",
    typeof completedTodo.state === "string" && completedTodo.state.length > 0,
  );

  TestValidator.predicate(
    "completed_at should be populated after completion",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at should be the same or later than before completion",
    new Date(completedTodo.updated_at).getTime() >=
      new Date(initialUpdatedAt).getTime(),
  );

  const firstCompletionUpdatedAt = completedTodo.updated_at;

  // 8. Invoke completion again to check stability/idempotence
  const completedAgainTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: createdTodoId,
    });
  typia.assert(completedAgainTodo);

  TestValidator.equals(
    "second completion should target the same todo id",
    completedAgainTodo.id,
    createdTodoId,
  );

  TestValidator.equals(
    "second completion should keep the same owner",
    completedAgainTodo.memberUser.id,
    memberId,
  );

  TestValidator.notEquals(
    "state after second completion should still differ from initial state",
    completedAgainTodo.state,
    initialState,
  );

  TestValidator.predicate(
    "completed_at should remain populated after second completion",
    completedAgainTodo.completed_at !== null &&
      completedAgainTodo.completed_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at after second completion should be >= first completion",
    new Date(completedAgainTodo.updated_at).getTime() >=
      new Date(firstCompletionUpdatedAt).getTime(),
  );
}
