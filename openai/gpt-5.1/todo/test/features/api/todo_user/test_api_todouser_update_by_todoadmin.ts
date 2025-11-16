import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

/**
 * Validate that a todoAdmin can update mutable fields of a todo user.
 *
 * Business context:
 *
 * - TodoAdmin accounts are privileged operators who can manage todoUser accounts,
 *   including changing display names, emails, and account status.
 * - TodoUser accounts own Todo items and authenticate via their own auth
 *   endpoints.
 *
 * This test exercises a realistic multi-actor flow:
 *
 * 1. Admin registration and authentication lifecycle
 * 2. Todo status catalogue setup
 * 3. End-user registration and login
 * 4. Todo creation under the todoUser account
 * 5. Admin-driven update of the todoUser profile
 * 6. Validation that updated fields changed, immutable fields remain stable, and
 *    timestamps behave as expected.
 */
export async function test_api_todouser_update_by_todoadmin(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin via /auth/todoAdmin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorizedFromJoin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // Preserve original admin profile snapshot for later comparisons if needed
  const originalAdminId = adminAuthorizedFromJoin.id;

  // 2. As todoAdmin, create at least one Todo status
  const todoStatusCreateBody = {
    code: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: todoStatusCreateBody,
    });
  typia.assert(createdStatus);

  // 3. Register a todoUser via /auth/todoUser/join
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorizedFromJoin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorizedFromJoin);

  const todoUserId = userAuthorizedFromJoin.id;
  const originalUserEmail = userAuthorizedFromJoin.email;
  const originalUserDisplayName = userAuthorizedFromJoin.displayName ?? null;
  const originalUserStatus = userAuthorizedFromJoin.status;
  const originalUserCreatedAt = userAuthorizedFromJoin.created_at;
  const originalUserUpdatedAt = userAuthorizedFromJoin.updated_at;

  TestValidator.equals(
    "todoUser join should yield stable id",
    todoUserId,
    userAuthorizedFromJoin.id,
  );

  // 4. Explicit login as todoUser (even though join already authenticated)
  const userLoginBody = {
    email: userJoinBody.email,
    password: userJoinBody.password,
    ip: userJoinBody.ip ?? null,
    href: userJoinBody.href,
    referrer: userJoinBody.referrer,
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userAuthorizedFromLogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(userAuthorizedFromLogin);

  TestValidator.equals(
    "todoUser id must remain same between join and login",
    userAuthorizedFromLogin.id,
    todoUserId,
  );

  // 5. As todoUser, create at least one Todo item
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString(),
    status_code: createdStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo should use requested status code",
    createdTodo.status.code,
    createdStatus.code,
  );

  // 6. Switch context back to todoAdmin by logging in with admin credentials
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip ?? null,
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/dashboard",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminAuthorizedFromLogin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  TestValidator.equals(
    "todoAdmin id should remain same between join and login",
    adminAuthorizedFromLogin.id,
    originalAdminId,
  );

  // 7. As todoAdmin, update the todoUser using PUT /todoApp/todoAdmin/todoUsers/{todoUserId}
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newDisplayName = RandomGenerator.name();
  const newStatus = originalUserStatus === "active" ? "suspended" : "active";

  const updateBody = {
    email: newEmail,
    display_name: newDisplayName,
    status: newStatus,
  } satisfies ITodoAppTodoUser.IUpdate;

  const updatedUser: ITodoAppTodoUser =
    await api.functional.todoApp.todoAdmin.todoUsers.update(connection, {
      todoUserId,
      body: updateBody,
    });
  typia.assert(updatedUser);

  // 8. Validate updated fields and immutable fields
  TestValidator.equals(
    "updated user id should match target",
    updatedUser.id,
    todoUserId,
  );
  TestValidator.equals(
    "updated user email should reflect new email",
    updatedUser.email,
    newEmail,
  );
  TestValidator.equals(
    "updated user display_name should reflect new display name",
    updatedUser.display_name ?? null,
    newDisplayName,
  );
  TestValidator.equals(
    "updated user status should reflect new status",
    updatedUser.status,
    newStatus,
  );

  TestValidator.equals(
    "created_at must remain unchanged after update",
    updatedUser.created_at,
    originalUserCreatedAt,
  );

  TestValidator.predicate(
    "updated_at must be refreshed after update",
    updatedUser.updated_at !== originalUserUpdatedAt,
  );

  // 9. Perform a second partial update: change only status back, leaving email and display_name intact
  const revertedStatus = originalUserStatus;
  const partialUpdateBody = {
    status: revertedStatus,
  } satisfies ITodoAppTodoUser.IUpdate;

  const partiallyUpdatedUser: ITodoAppTodoUser =
    await api.functional.todoApp.todoAdmin.todoUsers.update(connection, {
      todoUserId,
      body: partialUpdateBody,
    });
  typia.assert(partiallyUpdatedUser);

  TestValidator.equals(
    "partial update should keep email unchanged",
    partiallyUpdatedUser.email,
    updatedUser.email,
  );
  TestValidator.equals(
    "partial update should keep display_name unchanged",
    partiallyUpdatedUser.display_name ?? null,
    updatedUser.display_name ?? null,
  );
  TestValidator.equals(
    "partial update should reflect reverted status",
    partiallyUpdatedUser.status,
    revertedStatus,
  );

  TestValidator.predicate(
    "second update should advance updated_at further",
    partiallyUpdatedUser.updated_at !== updatedUser.updated_at,
  );
}
