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
 * Verify idempotent behavior of todo completion.
 *
 * Business goal
 *
 * - Ensure that calling PUT /todoApp/memberUser/todos/{todoId}/complete multiple
 *   times for the same member-owned todo results in a stable completed state
 *   without corrupting lifecycle fields.
 *
 * Steps
 *
 * 1. As admin, register and login to obtain administrative context.
 * 2. As admin, create at least one global system setting to ensure the todo domain
 *    is configured.
 * 3. As member, register and login to obtain member context.
 * 4. Create a new todo for this member in an active state.
 * 5. Call the completion endpoint once and verify:
 *
 *    - State changes compared to the initial todo state
 *    - Completed_at is non-null
 *    - Deleted_at remains null.
 * 6. Call the completion endpoint a second time for the same todo and verify
 *    idempotent behavior:
 *
 *    - The todo remains completed
 *    - Completed_at is still non-null and not earlier than the first completion
 *         timestamp
 *    - No soft deletion occurs and identifiers remain stable.
 */
export async function test_api_todo_completion_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Admin registration (join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/signup",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorizedFromJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Admin explicit login (switch/refresh context, even if join already authenticated)
  const adminLoginBody = {
    email: adminAuthorizedFromJoin.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedFromLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 3. Create a system setting that could affect todo behavior.
  //    We use a generic key/value pair with boolean semantic type.
  const systemSettingBody = {
    key: `max_active_todos_per_user_${RandomGenerator.alphaNumeric(8)}`,
    value: "100",
    type: "int",
    description: "Maximum number of active todos per member user for testing.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 4. Member registration (join)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://app.todo-app.test/signup",
    referrer: "https://app.todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorizedFromJoin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 5. Member login (ensure current auth context is the member)
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.todo-app.test/login",
    referrer: "https://app.todo-app.test/",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAuthorizedFromLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 6. Create a new active todo for the member
  const initialTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: initialTodoBody,
    });
  typia.assert(createdTodo);

  TestValidator.predicate(
    "created todo should be in active state before completion",
    createdTodo.state === initialTodoBody.state,
  );
  TestValidator.predicate(
    "created todo should not be completed yet (completed_at is null)",
    createdTodo.completed_at === null || createdTodo.completed_at === undefined,
  );
  TestValidator.predicate(
    "created todo should not be soft-deleted (deleted_at is null)",
    createdTodo.deleted_at === null || createdTodo.deleted_at === undefined,
  );

  // 7. First completion call
  const firstCompleted: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(firstCompleted);

  // Basic identity invariants
  TestValidator.equals(
    "todo id remains stable after first completion",
    firstCompleted.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "memberUser id remains stable after first completion",
    firstCompleted.memberUser.id,
    createdTodo.memberUser.id,
  );

  // State and lifecycle checks after first completion
  TestValidator.predicate(
    "todo state should change from initial state after completion (if implementation differentiates)",
    firstCompleted.state !== initialTodoBody.state ||
      createdTodo.state !== initialTodoBody.state,
  );
  TestValidator.predicate(
    "completed_at should be set after first completion",
    firstCompleted.completed_at !== null &&
      firstCompleted.completed_at !== undefined,
  );
  TestValidator.predicate(
    "todo should not be soft-deleted after first completion",
    firstCompleted.deleted_at === null ||
      firstCompleted.deleted_at === undefined,
  );

  const firstCompletedAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(firstCompleted.completed_at!);

  // 8. Second completion call (idempotency check)
  const secondCompleted: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(secondCompleted);

  // Identity invariants across all three snapshots
  TestValidator.equals(
    "todo id remains stable after second completion",
    secondCompleted.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "memberUser id remains stable after second completion",
    secondCompleted.memberUser.id,
    createdTodo.memberUser.id,
  );

  // State remains completed (at least, not regressed to the original state)
  TestValidator.predicate(
    "todo state remains at least as completed as after first completion",
    secondCompleted.state === firstCompleted.state ||
      secondCompleted.state !== initialTodoBody.state,
  );

  // Lifecycle flags should remain valid
  TestValidator.predicate(
    "completed_at remains non-null after second completion",
    secondCompleted.completed_at !== null &&
      secondCompleted.completed_at !== undefined,
  );
  TestValidator.predicate(
    "todo should not be soft-deleted after second completion",
    secondCompleted.deleted_at === null ||
      secondCompleted.deleted_at === undefined,
  );

  const secondCompletedAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(secondCompleted.completed_at!);

  // completed_at should not move backwards in time; in many implementations
  // it will remain exactly equal across idempotent calls.
  TestValidator.predicate(
    "completed_at from second completion should be equal or later than first completion",
    secondCompletedAt >= firstCompletedAt,
  );
}
