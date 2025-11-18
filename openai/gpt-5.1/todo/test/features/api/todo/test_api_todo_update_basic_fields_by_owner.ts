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
 * Verify that a member user can partially update the basic content fields of
 * their own todo.
 *
 * Business flow:
 *
 * 1. Create an admin user and initialize at least one system setting, simulating
 *    required global configuration.
 * 2. Register a member user (owner) via /auth/memberUser/join and rely on SDK to
 *    attach their token to the connection.
 * 3. As that member user, create an initial todo via /todoApp/memberUser/todos
 *    with title, optional description, state, and due_date.
 * 4. Capture the created todo and remember id, owner identity, state, created_at
 *    and updated_at, description and due_date.
 * 5. Send PUT /todoApp/memberUser/todos/{todoId} with ITodoAppTodo.IUpdate that
 *    changes title, description and due_date only (omit state).
 * 6. Validate that:
 *
 *    - Id remains the same.
 *    - MemberUser summary still points to the same owner (id and email unchanged).
 *    - Title, description and due_date have been updated to the new values.
 *    - State remains unchanged because it was omitted from the update body.
 *    - Created_at is unchanged, while updated_at is strictly greater than the
 *         original value.
 */
export async function test_api_todo_update_basic_fields_by_owner(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: join as admin and create at least one system setting.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassword123!",
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/landing",
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
      "Maximum number of active todos a single member user can have.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 2. Member user registration (owner of the todo).
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: "MemberPassword123!" as string & tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    href: "https://app.todo-app.local/signup" as string & tags.Format<"uri">,
    referrer: "https://app.todo-app.local/landing" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Create an initial todo as this member user.
  const initialDueDate: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: initialDueDate,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // Persist original values for later comparison.
  const originalId = createdTodo.id;
  const originalState = createdTodo.state;
  const originalCreatedAt = createdTodo.created_at;
  const originalUpdatedAt = createdTodo.updated_at;
  const originalMemberId = createdTodo.memberUser.id;
  const originalMemberEmail = createdTodo.memberUser.email;

  // Sanity checks on ownership and identity.
  TestValidator.equals(
    "created todo is owned by the authenticated member (id)",
    createdTodo.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "created todo is owned by the authenticated member (email)",
    createdTodo.memberUser.email,
    memberAuthorized.email,
  );

  // 4. Prepare update payload for title, description, and due_date only.
  const updatedDueDate: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();

  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: updatedDueDate,
  } satisfies ITodoAppTodo.IUpdate;

  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.update(connection, {
      todoId: createdTodo.id,
      body: updateBody,
    });
  typia.assert(updatedTodo);

  // 5. Validate identity, ownership, and unchanged fields.
  TestValidator.equals(
    "todo id should remain the same after update",
    updatedTodo.id,
    originalId,
  );

  TestValidator.equals(
    "memberUser id should remain the same after update",
    updatedTodo.memberUser.id,
    originalMemberId,
  );
  TestValidator.equals(
    "memberUser email should remain the same after update",
    updatedTodo.memberUser.email,
    originalMemberEmail,
  );

  TestValidator.equals(
    "state should remain unchanged when omitted from IUpdate",
    updatedTodo.state,
    originalState,
  );

  // 6. Validate updated content fields.
  TestValidator.equals(
    "title should be updated to the new value",
    updatedTodo.title,
    updateBody.title,
  );
  TestValidator.equals(
    "description should be updated to the new value",
    updatedTodo.description,
    updateBody.description,
  );
  TestValidator.equals(
    "due_date should be updated to the new value",
    updatedTodo.due_date,
    updateBody.due_date,
  );

  // 7. Validate timestamps: created_at unchanged, updated_at increased.
  TestValidator.equals(
    "created_at must remain unchanged after content update",
    updatedTodo.created_at,
    originalCreatedAt,
  );

  const originalUpdatedDate = new Date(originalUpdatedAt);
  const updatedUpdatedDate = new Date(updatedTodo.updated_at);

  TestValidator.predicate(
    "updated_at should be strictly greater than original updated_at",
    updatedUpdatedDate.getTime() > originalUpdatedDate.getTime(),
  );
}
