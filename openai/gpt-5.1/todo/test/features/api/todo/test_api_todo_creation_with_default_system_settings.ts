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
 * Validate that a member user can create a todo when default system settings
 * exist.
 *
 * Business narrative:
 *
 * - An admin onboards first and configures a global system setting such as
 *   `max_active_todos_per_user`, representing the generic requirement that
 *   certain configuration exists before members can interact with todos.
 * - A new member user then signs up and, under their authenticated context,
 *   creates a todo with a title, optional description, a due date, and an
 *   initial state string.
 * - The API should accept the request, respect the authenticated member as the
 *   owner, and return a fully populated ITodoAppTodo entity with correct
 *   mapping from the creation payload.
 *
 * Steps:
 *
 * 1. Register an admin via /auth/adminUser/join and rely on the SDK to set the
 *    Authorization header from the returned token.
 * 2. As that admin, create a system setting via /todoApp/adminUser/systemSettings
 *    with a key such as "max_active_todos_per_user" and a sane value.
 * 3. Register a member user via /auth/memberUser/join and enter the member context
 *    via the SDK-managed token.
 * 4. In the member context, call /todoApp/memberUser/todos with a
 *    ITodoAppTodo.ICreate payload including title, optional description,
 *    due_date and state.
 * 5. Assert that the returned ITodoAppTodo is structurally valid, that memberUser
 *    fields match the newly created member, and that title, description,
 *    due_date, and state are echoed or normalized as expected.
 */
export async function test_api_todo_creation_with_default_system_settings(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin#1234" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.todoapp.local/" as string & tags.Format<"uri">,
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a baseline system setting as admin
  const settingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description:
      "Maximum number of active todos allowed per member user in tests.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: settingBody,
    });
  typia.assert(systemSetting);

  // 3. Register a member user (this call also sets member Authorization in connection)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.local/join" as string & tags.Format<"uri">,
    referrer: "https://todoapp.local/landing" as string & tags.Format<"uri">,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const member: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // 4. With member context, create a todo
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    due_date: dueDate as string & tags.Format<"date-time">,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(todo);

  // 5. Business assertions
  TestValidator.equals(
    "todo owner must match newly joined member user",
    todo.memberUser.id,
    member.id,
  );

  TestValidator.equals(
    "todo title should echo request payload",
    todo.title,
    todoCreateBody.title,
  );

  TestValidator.equals(
    "todo description should echo request payload",
    todo.description ?? null,
    todoCreateBody.description ?? null,
  );

  TestValidator.equals(
    "todo due_date should echo request payload",
    todo.due_date ?? null,
    todoCreateBody.due_date ?? null,
  );

  TestValidator.equals(
    "todo state should match requested initial state",
    todo.state,
    todoCreateBody.state,
  );

  // Ensure created_at and updated_at exist and look like ISO strings via typia.assert already;
  // add a sanity predicate that updated_at is not before created_at.
  TestValidator.predicate("updated_at should be at or after created_at", () => {
    const created = new Date(todo.created_at).getTime();
    const updated = new Date(todo.updated_at).getTime();
    return (
      !Number.isNaN(created) && !Number.isNaN(updated) && updated >= created
    );
  });
}
