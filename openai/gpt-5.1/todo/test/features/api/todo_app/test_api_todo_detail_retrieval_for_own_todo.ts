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
 * Validate that a member user can retrieve full details of their own todo.
 *
 * Business flow:
 *
 * 1. Bootstrap admin context and create at least one system setting so that todo
 *    operations run under an initialized configuration.
 * 2. Register a member user (memberUser join) and obtain an authorized
 *    ITodoAppMemberUser.IAuthorized context.
 * 3. As this member, create a new todo via POST /todoApp/memberUser/todos using
 *    ITodoAppTodo.ICreate.
 * 4. Immediately fetch the same todo via GET /todoApp/memberUser/todos/{todoId}.
 * 5. Assert that all key fields (id, owner/memberUser, title, description, state,
 *    timestamps, due_date, completion and deletion markers) in the fetched todo
 *    match the originally created record.
 * 6. Confirm that the memberUser sub-object on the todo corresponds to the
 *    authenticated member (id and email) and that no cross-user data leak
 *    occurs.
 */
export async function test_api_todo_detail_retrieval_for_own_todo(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: join admin and create a system setting.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const systemSettingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description:
      "Maximum number of active todos allowed per member user in tests",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  TestValidator.equals(
    "system setting key must match creation payload",
    systemSetting.key,
    systemSettingBody.key,
  );

  // 2. Member registration (join) to get authorized member context.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.local/signup",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  TestValidator.equals(
    "member authorized email must match join email",
    memberAuthorized.email,
    memberJoinBody.email,
  );

  // 3. Create a todo as the authenticated member.
  const now = new Date();
  const dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: dueDate,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo title must match request payload",
    createdTodo.title,
    todoCreateBody.title,
  );
  TestValidator.equals(
    "created todo description must match request payload",
    createdTodo.description,
    todoCreateBody.description,
  );
  TestValidator.equals(
    "created todo state must match request payload",
    createdTodo.state,
    todoCreateBody.state,
  );
  TestValidator.equals(
    "created todo due_date must match request payload",
    createdTodo.due_date,
    todoCreateBody.due_date,
  );

  TestValidator.equals(
    "created todo owner id must equal authorized member id",
    createdTodo.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "created todo owner email must equal authorized member email",
    createdTodo.memberUser.email,
    memberAuthorized.email,
  );

  TestValidator.predicate(
    "created todo should not be soft-deleted initially",
    createdTodo.deleted_at === null || createdTodo.deleted_at === undefined,
  );

  // 4. Retrieve todo details by id as the same member.
  const fetchedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(fetchedTodo);

  // 5. Assertions: identity, ownership, field consistency.
  TestValidator.equals(
    "todo id must match between creation and retrieval",
    fetchedTodo.id,
    createdTodo.id,
  );

  TestValidator.equals(
    "fetched todo owner id must equal authorized member id",
    fetchedTodo.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "fetched todo owner email must equal authorized member email",
    fetchedTodo.memberUser.email,
    memberAuthorized.email,
  );

  TestValidator.equals(
    "todo title must remain unchanged between creation and retrieval",
    fetchedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "todo description must remain unchanged between creation and retrieval",
    fetchedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "todo state must remain unchanged between creation and retrieval",
    fetchedTodo.state,
    createdTodo.state,
  );

  TestValidator.equals(
    "due_date must remain unchanged between creation and retrieval",
    fetchedTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.equals(
    "created_at must remain consistent between creation and retrieval",
    fetchedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "updated_at must remain consistent between creation and retrieval",
    fetchedTodo.updated_at,
    createdTodo.updated_at,
  );
  TestValidator.equals(
    "completed_at must remain consistent between creation and retrieval",
    fetchedTodo.completed_at,
    createdTodo.completed_at,
  );
  TestValidator.equals(
    "deleted_at must remain consistent between creation and retrieval",
    fetchedTodo.deleted_at,
    createdTodo.deleted_at,
  );

  TestValidator.predicate(
    "fetched todo should not be soft-deleted",
    fetchedTodo.deleted_at === null || fetchedTodo.deleted_at === undefined,
  );
}
