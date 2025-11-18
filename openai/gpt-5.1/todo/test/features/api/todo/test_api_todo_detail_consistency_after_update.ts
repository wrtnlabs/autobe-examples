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
 * Ensure todo detail reflects latest updated state for a member user's todo.
 *
 * Business context:
 *
 * - Admin users can configure system-level settings for the todo application.
 * - Member users own personal todos; they can create and update them.
 * - The detail endpoint should always reflect the most recently persisted state
 *   of a todo right after an update.
 *
 * Steps:
 *
 * 1. Admin joins (self-register) and becomes authenticated adminUser.
 * 2. Admin creates a system setting to simulate required configuration.
 * 3. Member joins (self-register) and becomes authenticated memberUser.
 * 4. Member creates an initial todo.
 * 5. Member updates multiple fields of that todo (title, description, state,
 *    due_date).
 * 6. Immediately fetch the todo detail by id.
 * 7. Assert that detail response matches the updated state from the update
 *    response, and that identity/ownership and created_at remain stable, with
 *    consistent lifecycle fields (completed_at, deleted_at).
 */
export async function test_api_todo_detail_consistency_after_update(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
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
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);

  // 2. Admin creates a system setting (dummy but realistic)
  const systemSettingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description:
      "Maximum number of active todos a single member can have before creation is blocked.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(systemSetting);

  // 3. Member joins and becomes authenticated
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://member.todo-app.test/join",
    referrer: "https://member.todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberAuthorized);

  // 4. Member creates an initial todo
  const initialTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    state: "active",
    due_date: RandomGenerator.date(
      new Date(),
      1000 * 60 * 60 * 24 * 7,
    ).toISOString(),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: initialTodoBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  // Snapshot immutable identity fields and initial timestamps
  const createdTodoId = createdTodo.id;
  const createdOwner = createdTodo.memberUser;
  const createdAt = createdTodo.created_at;

  // 5. Member updates multiple fields on that todo
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedState = "completed";
  const updatedDueDate = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24 * 14,
  ).toISOString();

  const updateBody = {
    title: updatedTitle,
    description: updatedDescription,
    state: updatedState,
    due_date: updatedDueDate,
  } satisfies ITodoAppTodo.IUpdate;

  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.update(connection, {
      todoId: createdTodoId as string & tags.Format<"uuid">,
      body: updateBody,
    });
  typia.assert<ITodoAppTodo>(updatedTodo);

  // 6. Immediately fetch todo detail by id
  const detailedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.at(connection, {
      todoId: createdTodoId,
    });
  typia.assert<ITodoAppTodo>(detailedTodo);

  // 7. Assertions: identity and ownership stability
  TestValidator.equals(
    "todo id remains stable across create, update, and detail",
    updatedTodo.id,
    createdTodoId,
  );
  TestValidator.equals(
    "detail id equals updated todo id",
    detailedTodo.id,
    updatedTodo.id,
  );

  TestValidator.equals(
    "member ownership remains same between create and update",
    updatedTodo.memberUser.id,
    createdOwner.id,
  );
  TestValidator.equals(
    "member ownership remains same between update and detail",
    detailedTodo.memberUser.id,
    updatedTodo.memberUser.id,
  );

  // created_at should never change
  TestValidator.equals(
    "created_at timestamp remains unchanged after update",
    updatedTodo.created_at,
    createdAt,
  );
  TestValidator.equals(
    "detail created_at matches original creation time",
    detailedTodo.created_at,
    createdAt,
  );

  // updated_at should change from initial, and detail should match update's updated_at
  TestValidator.predicate("updated_at changes after update", () => {
    return createdTodo.updated_at !== updatedTodo.updated_at;
  });

  TestValidator.equals(
    "detail updated_at matches updated todo updated_at",
    detailedTodo.updated_at,
    updatedTodo.updated_at,
  );

  // Updated fields consistency
  TestValidator.equals(
    "updated title is reflected in detail endpoint",
    detailedTodo.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated description is reflected in detail endpoint",
    detailedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated state is reflected in detail endpoint",
    detailedTodo.state,
    updatedState,
  );
  TestValidator.equals(
    "updated due_date is reflected in detail endpoint",
    detailedTodo.due_date,
    updatedDueDate,
  );

  // Lifecycle fields consistency: completed_at & deleted_at
  TestValidator.equals(
    "completed_at is consistent between updated and detail todo",
    detailedTodo.completed_at,
    updatedTodo.completed_at,
  );
  TestValidator.equals(
    "deleted_at is consistent between updated and detail todo",
    detailedTodo.deleted_at,
    updatedTodo.deleted_at,
  );

  // Also the full objects except possibly for nested memberUser equality
  TestValidator.equals(
    "detail todo matches updated todo for core scalar fields",
    {
      id: detailedTodo.id,
      title: detailedTodo.title,
      description: detailedTodo.description,
      state: detailedTodo.state,
      due_date: detailedTodo.due_date,
      created_at: detailedTodo.created_at,
      updated_at: detailedTodo.updated_at,
      completed_at: detailedTodo.completed_at,
      deleted_at: detailedTodo.deleted_at,
    },
    {
      id: updatedTodo.id,
      title: updatedTodo.title,
      description: updatedTodo.description,
      state: updatedTodo.state,
      due_date: updatedTodo.due_date,
      created_at: updatedTodo.created_at,
      updated_at: updatedTodo.updated_at,
      completed_at: updatedTodo.completed_at,
      deleted_at: updatedTodo.deleted_at,
    },
  );
}
