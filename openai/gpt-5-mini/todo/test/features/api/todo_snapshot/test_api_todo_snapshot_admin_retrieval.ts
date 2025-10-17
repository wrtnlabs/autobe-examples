import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * E2E test: Admin retrieves a specific todo snapshot (version).
 *
 * Business purpose:
 *
 * - Ensures admin-scoped snapshot retrieval endpoint is accessible to admins,
 *   returns the expected snapshot DTO shape, and requires authentication.
 *
 * Test steps:
 *
 * 1. Create an admin account (admin A) — obtain admin token (SDK sets it).
 * 2. Create a regular user account (user) and create a Todo as that user.
 * 3. Create another admin account (admin B) to ensure admin-authenticated context
 *    for the admin endpoint call (SDK will set Authorization header).
 * 4. Call GET /todoApp/admin/todos/{todoId}/versions/{versionId} as admin using
 *    the todoId from created todo and a plausible random versionId.
 *    typia.assert() the response as ITodoAppTodoSnapshot.
 * 5. Validate simple business assertions on the snapshot and verify that
 *    unauthenticated access is rejected.
 */
export async function test_api_todo_snapshot_admin_retrieval(
  connection: api.IConnection,
) {
  // 1. Create first admin (admin A) to demonstrate admin creation flow
  const adminA: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Admin#1Pass!",
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(adminA);

  // 2. Create a regular user and sign-in (SDK will set Authorization to user token)
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "User#1Pass!",
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // 3. Create a Todo as the authenticated user
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        position: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.predicate(
    "created todo has id",
    typeof todo.id === "string" && todo.id.length > 0,
  );

  // 4. Create a second admin (admin B) to switch to admin auth context
  const adminB: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Admin#2Pass!",
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(adminB);

  // 5. Call the admin snapshot retrieval endpoint.
  // NOTE: Because the SDK lacks a snapshot-listing endpoint, we use a plausible
  // versionId (a random UUID) to exercise the endpoint in simulated environments
  // or against pre-populated systems. typia.assert validates the returned shape.
  const versionId = typia.random<string & tags.Format<"uuid">>();
  const snapshot: ITodoAppTodoSnapshot =
    await api.functional.todoApp.admin.todos.versions.at(connection, {
      todoId: todo.id,
      versionId,
    });
  typia.assert(snapshot);

  // Business-level assertions (typia.assert has already validated types/formats)
  TestValidator.predicate(
    "snapshot has snapshot_at",
    snapshot.snapshot_at !== null && snapshot.snapshot_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot contains id",
    typeof snapshot.id === "string" && snapshot.id.length > 0,
  );

  // 6. Verify unauthenticated admin access is rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin snapshot access is rejected",
    async () => {
      await api.functional.todoApp.admin.todos.versions.at(unauthConn, {
        todoId: todo.id,
        versionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
