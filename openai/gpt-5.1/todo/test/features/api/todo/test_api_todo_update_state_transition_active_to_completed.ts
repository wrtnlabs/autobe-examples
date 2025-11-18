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
 * Validate inline lifecycle state transition of a member user's todo from an
 * active state to a completed state.
 *
 * Business context:
 *
 * - Admins can configure system-level settings that may influence todo lifecycle
 *   behavior via /todoApp/adminUser/systemSettings.
 * - Member users own personal todos and can update them via
 *   /todoApp/memberUser/todos/{todoId}.
 * - This test focuses on an allowed inline state transition from an active-like
 *   state to a completed-like state and verifies lifecycle timestamps and
 *   ownership are handled correctly.
 *
 * Steps:
 *
 * 1. Register an admin user and configure a lifecycle-related system setting.
 * 2. Register a member user and authenticate as that member.
 * 3. Create an initial todo in an active state for the member.
 * 4. Update the todo's state to "completed" using the update endpoint.
 * 5. Validate state change, timestamps, and ownership.
 * 6. Optionally, verify that a different member cannot update another user's todo
 *    (authorization enforcement).
 */
export async function test_api_todo_update_state_transition_active_to_completed(
  connection: api.IConnection,
) {
  // 1. Admin setup and system setting configuration
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
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const settingBody = {
    key: "todo_lifecycle_direct_complete_enabled",
    value: "true",
    type: "boolean",
    description:
      "Flag to enable direct lifecycle completion transitions via update endpoint in tests.",
    group: "lifecycle",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: settingBody,
    });
  typia.assert(systemSetting);

  // 2. Member user setup and authentication
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
    ip: "127.0.0.1",
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://todo-app.test/login",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAuthorizedFromLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 3. Create an initial active todo for the member
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(createdTodo);

  const originalTodoId = createdTodo.id;
  const originalMemberId = createdTodo.memberUser.id;
  const originalState = createdTodo.state;
  const originalUpdatedAt = createdTodo.updated_at;
  const originalCompletedAt = createdTodo.completed_at ?? null;

  TestValidator.equals(
    "initial todo state must be active",
    originalState,
    "active",
  );

  // 4. Update the todo's state to "completed" via update endpoint
  const updateBody = {
    state: "completed",
  } satisfies ITodoAppTodo.IUpdate;

  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.update(connection, {
      todoId: originalTodoId,
      body: updateBody,
    });
  typia.assert(updatedTodo);

  // 5. Validate state change, timestamps, and ownership
  TestValidator.equals(
    "todo id is unchanged after update",
    updatedTodo.id,
    originalTodoId,
  );

  TestValidator.equals(
    "todo owner member id is unchanged after update",
    updatedTodo.memberUser.id,
    originalMemberId,
  );

  TestValidator.equals(
    "todo state transitioned to completed",
    updatedTodo.state,
    "completed",
  );

  TestValidator.notEquals(
    "updated_at must change after state update",
    updatedTodo.updated_at,
    originalUpdatedAt,
  );

  TestValidator.predicate(
    "completed_at is populated after completing todo",
    updatedTodo.completed_at !== null && updatedTodo.completed_at !== undefined,
  );

  if (originalCompletedAt !== null) {
    TestValidator.notEquals(
      "completed_at should reflect latest completion time when re-completing",
      updatedTodo.completed_at,
      originalCompletedAt,
    );
  }

  TestValidator.predicate(
    "deleted_at remains null/undefined after completion update",
    updatedTodo.deleted_at === null || updatedTodo.deleted_at === undefined,
  );

  // 6. Optional: verify non-owner cannot update the todo
  const otherMemberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const otherMemberPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const otherMemberJoinBody = {
    email: otherMemberEmail,
    password: otherMemberPassword,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.2",
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const otherMemberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: otherMemberJoinBody,
    });
  typia.assert(otherMemberAuthorized);

  const otherMemberLoginBody = {
    email: otherMemberEmail,
    password: otherMemberPassword,
    ip: "127.0.0.2",
    href: "https://todo-app.test/login",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const otherMemberAuthorizedFromLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: otherMemberLoginBody,
    });
  typia.assert(otherMemberAuthorizedFromLogin);

  const otherUpdateBody = {
    state: "active",
  } satisfies ITodoAppTodo.IUpdate;

  await TestValidator.error(
    "non-owner cannot update another user's todo",
    async () => {
      await api.functional.todoApp.memberUser.todos.update(connection, {
        todoId: originalTodoId,
        body: otherUpdateBody,
      });
    },
  );
}
